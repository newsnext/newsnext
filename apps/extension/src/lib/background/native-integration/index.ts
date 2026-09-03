import type {
  ExtensionConnectionCommandRequest,
  ExtensionToHost,
  NativeCommandResult,
  NativeLogEntry,
} from "@newsnext/extension-connection"
import type { PersistedSettings } from "../../settings/persisted-settings"
import type { SourceLoadResponse } from "../../source/load-result"
import type { NativeIntegrationServices } from "../action-context"
import type { NativeIntegrationFailureState } from "./connection"
import type { NativeIntegrationConnectionError, NativeIntegrationStatus, NativePort } from "./types"
import { browser } from "#imports"
import { PERSISTED_DATA_SLICES } from "../../settings/persisted-data"
import { normalizePersistedSettings } from "../../settings/persisted-settings"
import { createBackgroundActionContext } from "../action-context"
import { actionRegistry, executeRegisteredAction } from "../action-registry"
import { readApplicationData } from "../application-service"
import { initializeWorkerIdentity } from "../worker-identity"
import {
  classifyNativeIntegrationFailure,
  getNativeIntegrationReconnectDelay,
  isVersionAtLeast,
  MINIMUM_DAEMON_VERSION,
} from "./connection"
import { serializeNativeIntegrationError } from "./error"
import {
  pendingConnectionRequests,
  pendingInstanceRequests,
  pendingLogsRequests,
  pendingWidgetSnapshotRequests,
  pendingWorkerTakeoverRequests,
  pendingWorkspaceRequests,
  rejectAllPendingRequests,
  rejectPendingRequest,
  resolvePendingConnectionRequests,
  settleInstanceRequest,
  settleWidgetRequest,
  settleWorkerTakeoverRequest,
  takePendingRequest,
} from "./pending-requests"
import { NATIVE_INTEGRATION_PERMISSIONS } from "./permission"
import { clearNativeMessageChunks, parseNativeHostValue } from "./protocol"
import {
  requestInstanceCache as requestInstanceCacheInternal,
  requestInstanceLoad as requestInstanceLoadInternal,
  requestLogs as requestLogsInternal,
  requestWidgetSnapshot as requestWidgetSnapshotInternal,
} from "./requests"
import {
  NATIVE_HOST_NAME,
  NATIVE_INTEGRATION_RECONNECT_ALARM,
  NATIVE_REQUEST_TIMEOUT_MS,
  PROTOCOL_VERSION,
  RECONNECT_ALARM_PERIOD_MINUTES,
  runtime,
  WORKSPACE_UPDATED_AT_KEY,
} from "./state"
import {
  regenerateWorker,
  takeOverWorker,
} from "./worker-routing"
import {
  applyWorkspaceChangePatch,
  commitSettings,
  createWorkspace,
  enqueueIncomingWorkspace,
  registerApplicationDataSync,
  settleWorkspaceRequest,
} from "./workspace-sync"

export type {
  NativeIntegrationConnectionError,
  NativeIntegrationState,
  NativeIntegrationStatus,
} from "./types"

export const nativeIntegrationServices: NativeIntegrationServices = {
  instanceRouter: {
    load: requestInstanceLoad,
    readCache: requestInstanceCache,
  },
  nativeIntegration: {
    getLogs: requestLogs,
    getStatus: async () => getNativeIntegrationStatus(),
    setEnabled: async ({ enabled }) => await setNativeIntegrationEnabled(enabled),
  },
  widgetSnapshots: {
    get: requestWidgetSnapshot,
  },
  workerRouter: {
    regenerateIdentity: regenerateWorkerIdentity,
    takeOver: async ({ instanceIds, workerId }) => (
      await takeOverOfflineWorker(workerId, instanceIds)
    ),
  },
}

const connectedActionContext = createBackgroundActionContext(nativeIntegrationServices)

export function getNativeIntegrationStatus(): NativeIntegrationStatus {
  return {
    appVersion: runtime.appVersion,
    capabilities: [...runtime.capabilities],
    offlineWorkers: runtime.offlineWorkers.map(worker => ({ ...worker })),
    connectionError: runtime.connectionError,
    state: runtime.enabled ? runtime.connectionState : "disabled",
    workerId: runtime.workerId,
    widgetServerUrl: runtime.widgetServerUrl,
  }
}

export async function requestWidgetSnapshot(input: {
  boardId: string
  widgetId: string
}): Promise<unknown> {
  return await requestWidgetSnapshotInternal(input, requireNativeConnection)
}

export async function requestLogs(): Promise<NativeLogEntry[]> {
  return await requestLogsInternal(requireNativeConnection)
}

export async function requestInstanceLoad(
  input: { instanceId: string },
): Promise<SourceLoadResponse> {
  return await requestInstanceLoadInternal(input, requireNativeConnection, connectedActionContext)
}

export async function requestInstanceCache(
  input: { instanceId: string },
): Promise<SourceLoadResponse | null> {
  return await requestInstanceCacheInternal(input, requireNativeConnection, connectedActionContext)
}

export async function setNativeIntegrationEnabled(
  nextEnabled: boolean,
): Promise<NativeIntegrationStatus> {
  if (nextEnabled && !await hasNativeIntegrationPermission()) {
    throw new Error("NewsNext App integration requires Native Messaging permission")
  }

  const key = PERSISTED_DATA_SLICES.settings.key
  const stored = await browser.storage.local.get(key)
  const settings = normalizePersistedSettings(stored[key])
  const nextSettings: PersistedSettings = {
    ...settings,
    general: {
      ...settings.general,
      appIntegrationEnabled: nextEnabled,
    },
  }
  await commitSettings(nextSettings, requireNativeConnection)
  await browser.storage.local.set({ [key]: nextSettings })
  await applyNativeIntegrationEnabled(nextEnabled)
  return getNativeIntegrationStatus()
}

const workerConnectionControls = {
  disconnect,
  getStatus: getNativeIntegrationStatus,
  reconnect: connect,
  requireConnection: requireNativeConnection,
}

export async function takeOverOfflineWorker(
  sourceWorkerId: string,
  instanceIds: string[],
): Promise<NativeIntegrationStatus> {
  return await takeOverWorker(sourceWorkerId, instanceIds, workerConnectionControls)
}

export async function regenerateWorkerIdentity(): Promise<NativeIntegrationStatus> {
  return await regenerateWorker(workerConnectionControls)
}

async function executeCommand(
  connection: NativePort,
  request: ExtensionConnectionCommandRequest,
): Promise<void> {
  let result: NativeCommandResult
  try {
    result = {
      ok: true,
      data: request.type === "action.list"
        ? actionRegistry.list("connected")
        : await executeRegisteredAction(
            request.name,
            request.input,
            "connected",
            connectedActionContext,
            request.id,
          ),
    }
  } catch (error) {
    result = {
      ok: false,
      error: serializeNativeIntegrationError(error),
    }
  }

  if (!runtime.enabled || runtime.port !== connection) return
  const message: ExtensionToHost = {
    type: "complete",
    requestId: request.id,
    result,
  }
  connection.postMessage(message)
}

function disconnect(): void {
  const connection = runtime.port
  clearReconnectBackoff()
  resetConnectionState()
  connection?.disconnect()
}

function resetConnectionState(
  state: NativeIntegrationFailureState = "serviceNotRunning",
  error?: NativeIntegrationConnectionError,
): void {
  runtime.port = undefined
  runtime.appVersion = undefined
  runtime.capabilities = []
  runtime.workerRoutingRevision = 0
  runtime.offlineWorkers = []
  runtime.widgetServerUrl = undefined
  runtime.connectionState = state
  runtime.connectionError = error
  const connectionFailure = new Error(error?.message ?? "NewsNext App disconnected")
  rejectAllPendingRequests(connectionFailure)
  clearNativeMessageChunks()
}

function clearReconnectBackoff(): void {
  if (runtime.reconnectTimer !== undefined) clearTimeout(runtime.reconnectTimer)
  runtime.reconnectTimer = undefined
  runtime.reconnectAttempt = 0
}

function isRetryableConnectionState(): boolean {
  return runtime.connectionState === "hostNotInstalled"
    || runtime.connectionState === "serviceNotRunning"
}

function scheduleReconnect(): void {
  if (!runtime.enabled
    || runtime.port
    || runtime.reconnectTimer !== undefined
    || !isRetryableConnectionState()) {
    return
  }
  const delay = getNativeIntegrationReconnectDelay(runtime.reconnectAttempt)
  runtime.reconnectAttempt += 1
  runtime.reconnectTimer = setTimeout(() => {
    runtime.reconnectTimer = undefined
    connect()
  }, delay)
}

function failConnection(connection: NativePort, message: string | undefined, code?: string): void {
  if (runtime.port !== connection) return
  const state = classifyNativeIntegrationFailure(message, code)
  resetConnectionState(state, createConnectionError(state, message, code))
  connection.disconnect()
  if (isRetryableConnectionState()) scheduleReconnect()
}

function createConnectionError(
  state: NativeIntegrationFailureState,
  message: string | undefined,
  code?: string,
): NativeIntegrationConnectionError | undefined {
  if (!message) return undefined
  const normalizedCode = code ?? {
    daemonOutdated: "DAEMON_OUTDATED",
    hostNotInstalled: "HOST_MISSING",
    protocolIncompatible: "PROTOCOL_INCOMPATIBLE",
    serviceNotRunning: "NATIVE_HOST_DISCONNECTED",
    workerConflict: "WORKER_ALREADY_CONNECTED",
  }[state]
  return { code: normalizedCode, message }
}

function runtimeLastErrorMessage(): string | undefined {
  const browserRuntime = browser.runtime as typeof browser.runtime & {
    lastError?: { message?: string }
  }
  return browserRuntime.lastError?.message
}

async function requireNativeConnection(): Promise<NativePort> {
  if (!runtime.enabled) throw new Error("NewsNext App integration is disabled")
  if (runtime.connectionState === "connected" && runtime.port) return runtime.port
  if (isRetryableConnectionState() && runtime.reconnectTimer === undefined) connect()
  if (runtime.connectionState !== "connecting" || !runtime.port) {
    throw new Error("NewsNext App is not connected")
  }
  return await new Promise((resolve, reject) => {
    const pending = {
      reject,
      resolve,
      timeoutId: setTimeout(() => {
        pendingConnectionRequests.delete(pending)
        reject(new Error("Timed out connecting to the NewsNext App"))
      }, NATIVE_REQUEST_TIMEOUT_MS),
    }
    pendingConnectionRequests.add(pending)
  })
}

function connect(): void {
  if (!runtime.enabled || runtime.port) return

  runtime.connectionState = "connecting"
  runtime.connectionError = undefined
  runtime.appVersion = undefined
  runtime.capabilities = []
  runtime.widgetServerUrl = undefined
  let nextPort: NativePort
  try {
    nextPort = browser.runtime.connectNative(NATIVE_HOST_NAME)
  } catch (error) {
    const message = error instanceof Error ? error.message : undefined
    const state = classifyNativeIntegrationFailure(message)
    resetConnectionState(state, createConnectionError(state, message))
    if (isRetryableConnectionState()) scheduleReconnect()
    return
  }
  runtime.port = nextPort
  nextPort.onDisconnect.addListener(() => handleDisconnect(nextPort))
  nextPort.onMessage.addListener((value: unknown) => handleMessage(nextPort, value))

  const hello: ExtensionToHost = {
    type: "hello",
    protocolVersion: PROTOCOL_VERSION,
    worker: {
      id: runtime.workerId,
      browser: import.meta.env.BROWSER,
      extensionVersion: browser.runtime.getManifest().version,
    },
    workspace: runtime.workspace,
  }
  nextPort.postMessage(hello)
}

function handleDisconnect(connection: NativePort): void {
  if (runtime.port !== connection) return
  const errorMessage = runtimeLastErrorMessage()
  const state = runtime.connectionState === "daemonOutdated"
    || runtime.connectionState === "protocolIncompatible"
    || runtime.connectionState === "workerConflict"
    ? runtime.connectionState
    : classifyNativeIntegrationFailure(errorMessage, runtime.connectionError?.code)
  resetConnectionState(
    state,
    errorMessage
      ? createConnectionError(state, errorMessage, runtime.connectionError?.code)
      : runtime.connectionError,
  )
  if (isRetryableConnectionState()) scheduleReconnect()
}

function handleMessage(connection: NativePort, value: unknown): void {
  if (!runtime.enabled || runtime.port !== connection) return
  try {
    const message = parseNativeHostValue(value)
    if (!message) return
    if (message.type === "ready") {
      if (message.protocolVersion !== PROTOCOL_VERSION) {
        failConnection(
          connection,
          `Unsupported native protocol version ${message.protocolVersion}; expected ${PROTOCOL_VERSION}`,
          "PROTOCOL_INCOMPATIBLE",
        )
        return
      }
      if (!isVersionAtLeast(message.daemonVersion, MINIMUM_DAEMON_VERSION)) {
        failConnection(
          connection,
          `NewsNext daemon ${message.daemonVersion} is older than required ${MINIMUM_DAEMON_VERSION}`,
          "DAEMON_OUTDATED",
        )
        return
      }
      clearReconnectBackoff()
      runtime.appVersion = message.daemonVersion
      runtime.capabilities = [...message.capabilities]
      runtime.workerRoutingRevision = message.workerRoutingRevision
      runtime.offlineWorkers = message.offlineWorkers
      runtime.widgetServerUrl = message.widgetServerUrl
      runtime.connectionState = "connected"
      resolvePendingConnectionRequests(connection)
      enqueueIncomingWorkspace(
        connection,
        () => message.workspace,
        message.localInstanceIds,
        "Failed to apply the NewsNext Workspace",
      )
    } else if (message.type === "workerRoutingChanged") {
      if (message.revision > runtime.workerRoutingRevision) {
        runtime.workerRoutingRevision = message.revision
        runtime.localInstanceIds = new Set(message.localInstanceIds)
        runtime.offlineWorkers = message.offlineWorkers
      }
    } else if (message.type === "workerTakeoverResult") {
      settleWorkerTakeoverRequest(message.requestId)
    } else if (message.type === "execute") {
      void executeCommand(connection, message.request).catch((error) => {
        console.error("Failed to return native App integration result", error)
      })
    } else if (message.type === "widgetSnapshotResult") {
      settleWidgetRequest(message.requestId, message.result)
    } else if (message.type === "workspaceChanged") {
      enqueueIncomingWorkspace(
        connection,
        () => applyWorkspaceChangePatch(message.patch),
        message.localInstanceIds,
        "Failed to apply the NewsNext Workspace update",
      )
    } else if (message.type === "workspaceResult") {
      settleWorkspaceRequest(message.requestId, message.revision, message.localInstanceIds)
    } else if (message.type === "instanceResult") {
      settleInstanceRequest(message.requestId, message.result)
    } else if (message.type === "logsResult") {
      takePendingRequest(pendingLogsRequests, message.requestId)?.resolve(message.logs)
    } else {
      if (message.requestId) {
        const error = new Error(message.message)
        if (rejectPendingRequest(pendingWidgetSnapshotRequests, message.requestId, error)
          || rejectPendingRequest(pendingInstanceRequests, message.requestId, error)
          || rejectPendingRequest(pendingWorkspaceRequests, message.requestId, error)
          || rejectPendingRequest(pendingLogsRequests, message.requestId, error)
          || rejectPendingRequest(pendingWorkerTakeoverRequests, message.requestId, error)) {
          return
        }
      }
      failConnection(connection, message.message, message.code)
      console.error("NewsNext native host error", message.message)
    }
  } catch (error) {
    console.error("Failed to process NewsNext native host message", error)
    failConnection(connection, error instanceof Error ? error.message : undefined)
  }
}

async function applyNativeIntegrationEnabled(nextEnabled: boolean): Promise<void> {
  if (runtime.enabled === nextEnabled) return
  runtime.enabled = nextEnabled
  if (runtime.enabled) {
    browser.alarms.create(NATIVE_INTEGRATION_RECONNECT_ALARM, {
      periodInMinutes: RECONNECT_ALARM_PERIOD_MINUTES,
    })
    connect()
    return
  }
  disconnect()
  await browser.alarms.clear(NATIVE_INTEGRATION_RECONNECT_ALARM)
}

async function applySynchronizedNativeIntegrationEnabled(requestedEnabled: boolean): Promise<void> {
  await applyNativeIntegrationEnabled(requestedEnabled && await hasNativeIntegrationPermission())
}

async function synchronizeSettingsChange(settings: PersistedSettings): Promise<void> {
  try {
    await commitSettings(settings, requireNativeConnection)
    await applySynchronizedNativeIntegrationEnabled(settings.general.appIntegrationEnabled)
  } catch (error) {
    console.error("Failed to synchronize Settings", error)
  }
}

async function hasNativeIntegrationPermission(): Promise<boolean> {
  return await browser.permissions.contains({
    permissions: [...NATIVE_INTEGRATION_PERMISSIONS],
  }).catch(() => false)
}

export async function registerNativeIntegration(): Promise<void> {
  registerApplicationDataSync(requireNativeConnection)
  browser.alarms.onAlarm.addListener((alarm) => {
    if (runtime.enabled
      && alarm.name === NATIVE_INTEGRATION_RECONNECT_ALARM
      && isRetryableConnectionState()
      && runtime.reconnectTimer === undefined) {
      connect()
    }
  })
  browser.storage.onChanged.addListener((changes, areaName) => {
    const change = changes[PERSISTED_DATA_SLICES.settings.key]
    if (areaName === "local" && change) {
      void synchronizeSettingsChange(normalizePersistedSettings(change.newValue))
    }
  })
  browser.permissions.onRemoved.addListener((permissions) => {
    if (runtime.enabled && permissions.permissions?.includes("nativeMessaging")) {
      void setNativeIntegrationEnabled(false)
    }
  })

  const stored = await browser.storage.local.get([
    PERSISTED_DATA_SLICES.settings.key,
    WORKSPACE_UPDATED_AT_KEY,
  ])
  const application = await readApplicationData()
  const settings = normalizePersistedSettings(stored[PERSISTED_DATA_SLICES.settings.key])
  runtime.workerId = await initializeWorkerIdentity()
  runtime.localInstanceIds = new Set()
  const storedUpdatedAt = stored[WORKSPACE_UPDATED_AT_KEY]
  const updatedAt = Number.isSafeInteger(storedUpdatedAt) && Number(storedUpdatedAt) >= 0
    ? Number(storedUpdatedAt)
    : 0
  runtime.workspace = createWorkspace(application, 0, updatedAt, settings)
  const hasPermission = await hasNativeIntegrationPermission()
  runtime.enabled = settings.general.appIntegrationEnabled && hasPermission
  if (runtime.enabled) {
    browser.alarms.create(NATIVE_INTEGRATION_RECONNECT_ALARM, {
      periodInMinutes: RECONNECT_ALARM_PERIOD_MINUTES,
    })
    connect()
  } else {
    await browser.alarms.clear(NATIVE_INTEGRATION_RECONNECT_ALARM)
  }
}
