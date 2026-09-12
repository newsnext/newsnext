import type { PersistedSettings } from "../../settings/persisted-settings"
import type { BackgroundActionDependencies } from "../action-context"
import type { BackgroundActionContext } from "../background-actions"
import type { NativeIntegrationFailureState } from "./connection"
import type { NativeIntegrationConnectionError, NativeIntegrationStatus, NativePort } from "./types"
import type { ExtensionCommand } from "@/lib/native-protocol/ExtensionCommand"
import type { ExtensionToHost } from "@/lib/native-protocol/ExtensionToHost"
import { JSONRPCErrorException } from "json-rpc-2.0"
import { browser } from "#imports"
import { PERSISTED_DATA_SLICES } from "../../settings/persisted-data"
import { normalizePersistedSettings } from "../../settings/persisted-settings"
import { createBackgroundActionContext } from "../action-context"
import { actionRegistry, executeRegisteredAction } from "../action-registry"
import { readApplicationData } from "../application-service"
import { BACKGROUND_DIAGNOSTICS_CHANGED } from "../diagnostics-events"
import { WIDGET_CATALOG_CHANGED } from "../widget-catalog-events"
import { initializeWorkerIdentity } from "../worker-identity"
import { summarizeWorkspace } from "../workspace-resolution"
import {
  classifyNativeIntegrationFailure,
  getNativeIntegrationReconnectDelay,
  isVersionAtLeast,
  MINIMUM_DAEMON_VERSION,
} from "./connection"
import { rejectNativeConnection, resolveNativeConnection, waitForNativeConnection } from "./connection-ready"
import { serializeNativeIntegrationError } from "./error"
import {
  loadRoutedLiveCard,
  readRoutedLiveCardCache,
} from "./live-card-routing"
import { NATIVE_INTEGRATION_PERMISSIONS } from "./permission"
import { clearNativeMessageChunks, parseNativeHostValue, parseNativeNotification } from "./protocol"
import { closeNativeRpc, nativeRpc, openNativeRpc, receiveNativeRpc } from "./rpc"
import { registerSdkBridge } from "./sdk"
import {
  NATIVE_HOST_NAME,
  NATIVE_INTEGRATION_RECONNECT_ALARM,
  PROTOCOL_VERSION,
  RECONNECT_ALARM_PERIOD_MINUTES,
  runtime,
  WORKSPACE_SYNCED_AT_KEY,
  WORKSPACE_UPDATED_AT_KEY,
} from "./state"
import {
  regenerateWorker,
  takeOverWorker,
} from "./worker-management"
import {
  applyWorkspaceChangePatch,
  commitSettings,
  createWorkspace,
  enqueueIncomingWorkspace,
  initializeSharedWorkspace,
  registerApplicationDataSync,
  resolveWorkspace,
} from "./workspace-sync"

export type {
  NativeIntegrationConnectionError,
  NativeIntegrationState,
  NativeIntegrationStatus,
} from "./types"

const workerConnectionControls = {
  disconnect,
  getStatus: getNativeIntegrationStatus,
  reconnect: connect,
  requireConnection: requireNativeConnection,
}

export const backgroundActionDependencies: BackgroundActionDependencies = {
  liveCardRouter: {
    load: input => loadRoutedLiveCard(
      input,
      requireNativeConnection,
      getConnectedActionContext(),
    ),
    readCache: input => readRoutedLiveCardCache(
      input,
      requireNativeConnection,
      getConnectedActionContext(),
    ),
  },
  nativeIntegration: {
    getLogs: async () => nativeRpc(await requireNativeConnection()).request("logsGet", {}),
    getCollectionStatus: async () => {
      if (!runtime.capabilities.includes("collectionStatusPush")) throw new Error("This NewsNext App does not support live stream diagnostics. Update and restart the daemon.")
      const cached = runtime.collectionStatus
      if (cached) return cached
      const snapshot = await nativeRpc(await requireNativeConnection()).request("collectionStatusGet", {})
      if (runtime.collectionSubscribed) runtime.collectionStatus ??= snapshot
      return runtime.collectionStatus ?? snapshot
    },
    setCollectionSubscribed: (enabled) => {
      runtime.collectionSubscribed = enabled
      if (!enabled) runtime.collectionStatus = undefined
      sendCollectionSubscription()
    },
    getStatus: async () => getNativeIntegrationStatus(),
    resolveWorkspace: async ({ resolution, expectedRevision }) => {
      await resolveWorkspace(resolution, expectedRevision)
      sendCollectionSubscription()
      notifyDiagnostics()
      return getNativeIntegrationStatus()
    },
    setEnabled: ({ enabled }) => setNativeIntegrationEnabled(enabled),
  },
  workerManagement: {
    regenerateIdentity: () => regenerateWorker(workerConnectionControls),
    takeOver: ({ cardIds, workerId }) => (
      takeOverWorker(workerId, cardIds, workerConnectionControls)
    ),
  },
}

function sendCollectionSubscription(): void {
  if (runtime.connectionState === "connected" && runtime.port && runtime.capabilities.includes("collectionStatusPush")) {
    const connection = runtime.port
    void nativeRpc(connection).request("collectionStatusSubscribe", { enabled: runtime.collectionSubscribed }).catch((error) => {
      failConnection(connection, error instanceof Error ? error.message : "Failed to subscribe to collection status")
    })
  }
}

function notifyDiagnostics(): void {
  if (runtime.collectionSubscribed) void browser.runtime.sendMessage({ type: BACKGROUND_DIAGNOSTICS_CHANGED }).catch(() => undefined)
}

let connectedActionContext: BackgroundActionContext | undefined

function getConnectedActionContext(): BackgroundActionContext {
  connectedActionContext ??= createBackgroundActionContext(backgroundActionDependencies)
  return connectedActionContext
}

function getNativeIntegrationStatus(): NativeIntegrationStatus {
  return {
    workspaceConflict: runtime.pendingWorkspace
      ? {
          revision: runtime.pendingWorkspace.revision,
          local: summarizeWorkspace(runtime.workspace),
          shared: summarizeWorkspace(runtime.pendingWorkspace),
        }
      : undefined,
    daemonVersion: runtime.daemonVersion,
    capabilities: [...runtime.capabilities],
    offlineWorkers: runtime.offlineWorkers.map(worker => ({ ...worker })),
    connectionError: runtime.connectionError,
    state: runtime.enabled ? runtime.connectionState : "disabled",
    workerId: runtime.workerId,
    widgetServerOrigin: runtime.widgetServerOrigin,
  }
}

async function setNativeIntegrationEnabled(
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
      nativeIntegrationEnabled: nextEnabled,
    },
  }
  await commitNativeIntegrationSettings(nextSettings)
  await browser.storage.local.set({ [key]: nextSettings })
  await applyNativeIntegrationEnabled(nextEnabled)
  return getNativeIntegrationStatus()
}

async function executeCommand(connection: NativePort, request: ExtensionCommand): Promise<unknown> {
  if (!runtime.enabled || runtime.port !== connection) throw new Error("NewsNext App disconnected")
  if (runtime.connectionState !== "connected" && request.type !== "action.list"
    && !["nativeIntegration.getStatus", "nativeIntegration.resolveWorkspace", "nativeIntegration.setEnabled"].includes(request.name)) {
    throw new Error("Resolve this browser's Workspace in Settings before using connected Actions")
  }
  try {
    return request.type === "action.list"
      ? actionRegistry.list()
      : await executeRegisteredAction(
          request.name,
          request.input,
          "connected",
          getConnectedActionContext(),
          request.id,
        )
  } catch (error) {
    const serialized = serializeNativeIntegrationError(error)
    throw new JSONRPCErrorException(serialized.message, -32000, serialized)
  }
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
  if (runtime.port) closeNativeRpc(runtime.port, error?.message ?? "NewsNext App disconnected")
  runtime.port = undefined
  runtime.pendingWorkspace = undefined
  runtime.collectionStatus = undefined
  runtime.daemonVersion = undefined
  runtime.capabilities = []
  runtime.workerRoutingRevision = 0
  runtime.offlineWorkers = []
  runtime.widgetServerOrigin = undefined
  runtime.connectionState = state
  runtime.connectionError = error
  const connectionFailure = new Error(error?.message ?? "NewsNext App disconnected")
  rejectNativeConnection(connectionFailure)
  clearNativeMessageChunks()
  notifyDiagnostics()
}

function clearReconnectBackoff(): void {
  if (runtime.reconnectTimer !== undefined) clearTimeout(runtime.reconnectTimer)
  runtime.reconnectTimer = undefined
  runtime.reconnectAttempt = 0
}

function isRetryableConnectionState(): boolean {
  return runtime.connectionState === "hostNotInstalled"
    || runtime.connectionState === "serviceNotRunning"
    || runtime.connectionState === "daemonStartFailed"
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
    daemonStartFailed: "DAEMON_START_FAILED",
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
  return await waitForNativeConnection()
}

function connect(): void {
  if (!runtime.enabled || runtime.port) return

  runtime.connectionState = "connecting"
  runtime.daemonVersion = undefined
  runtime.capabilities = []
  runtime.widgetServerOrigin = undefined
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
  openNativeRpc(nextPort, request => executeCommand(nextPort, request), message => handleNotification(nextPort, message.method, message.params), message => failConnection(nextPort, message))
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
  try {
    nextPort.postMessage(hello)
  } catch (error) {
    failConnection(nextPort, error instanceof Error ? error.message : "Failed to initialize native connection")
  }
}

function handleDisconnect(connection: NativePort): void {
  if (runtime.port !== connection) return
  const errorMessage = runtimeLastErrorMessage()
  const state = classifyNativeIntegrationFailure(
    runtime.connectionError?.message ?? errorMessage,
    runtime.connectionError?.code,
  )
  resetConnectionState(
    state,
    runtime.connectionError ?? createConnectionError(state, errorMessage),
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
      runtime.daemonVersion = message.daemonVersion
      runtime.capabilities = [...message.capabilities]
      runtime.workerRoutingRevision = message.workerRoutingRevision
      runtime.offlineWorkers = message.offlineWorkers
      runtime.widgetServerOrigin = message.widgetServerUrl
      runtime.connectionError = undefined
      void initializeSharedWorkspace(connection, message.workspace, message.localCardIds).then(() => {
        if (runtime.port !== connection) return
        if (runtime.connectionState === "connected") {
          resolveNativeConnection(connection)
          sendCollectionSubscription()
        } else {
          rejectNativeConnection(new Error("Resolve the Workspace in Settings to finish connecting"))
        }
        notifyDiagnostics()
      }).catch(error => failConnection(connection, error instanceof Error ? error.message : "Failed to initialize Workspace"))
    } else if (message.type === "rpc") {
      void receiveNativeRpc(connection, message.message).catch((error) => {
        console.error("Failed to process native RPC message", error)
        failConnection(connection, error instanceof Error ? error.message : "Native RPC failed")
      })
    } else {
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

async function commitNativeIntegrationSettings(settings: PersistedSettings): Promise<void> {
  if (!settings.general.nativeIntegrationEnabled) {
    // Disabling must remain available even when the daemon cannot be reached.
    await applyNativeIntegrationEnabled(false)
    await runtime.workspaceCommitQueue
  }
  await commitSettings(settings, requireNativeConnection)
}

async function synchronizeSettingsChange(settings: PersistedSettings): Promise<void> {
  try {
    await commitNativeIntegrationSettings(settings)
    await applySynchronizedNativeIntegrationEnabled(settings.general.nativeIntegrationEnabled)
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
  registerSdkBridge(requireNativeConnection)
  registerApplicationDataSync(requireNativeConnection)
  browser.alarms.onAlarm.addListener((alarm) => {
    if (runtime.enabled
      && alarm.name === NATIVE_INTEGRATION_RECONNECT_ALARM
      && isRetryableConnectionState()
      && runtime.reconnectTimer === undefined) {
      connect()
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
    WORKSPACE_SYNCED_AT_KEY,
  ])
  const application = await readApplicationData()
  const settings = normalizePersistedSettings(stored[PERSISTED_DATA_SLICES.settings.key])
  runtime.workerId = await initializeWorkerIdentity()
  runtime.localCardIds = new Set()
  const storedUpdatedAt = stored[WORKSPACE_UPDATED_AT_KEY]
  const updatedAt = Number.isSafeInteger(storedUpdatedAt) && Number(storedUpdatedAt) >= 0
    ? Number(storedUpdatedAt)
    : 0
  const syncedAt = stored[WORKSPACE_SYNCED_AT_KEY]
  runtime.workspaceSyncedAt = Number.isSafeInteger(syncedAt) && Number(syncedAt) >= 0 ? Number(syncedAt) : undefined
  runtime.workspace = createWorkspace(application, 0, updatedAt, settings)
  const hasPermission = await hasNativeIntegrationPermission()
  runtime.enabled = settings.general.nativeIntegrationEnabled && hasPermission
  browser.storage.onChanged.addListener((changes, areaName) => {
    const change = changes[PERSISTED_DATA_SLICES.settings.key]
    if (areaName === "local" && change) {
      void synchronizeSettingsChange(normalizePersistedSettings(change.newValue))
    }
  })
  if (runtime.enabled) {
    browser.alarms.create(NATIVE_INTEGRATION_RECONNECT_ALARM, {
      periodInMinutes: RECONNECT_ALARM_PERIOD_MINUTES,
    })
    connect()
  } else {
    await browser.alarms.clear(NATIVE_INTEGRATION_RECONNECT_ALARM)
  }
}

function handleNotification(connection: NativePort, method: string, params: unknown): void {
  if (!runtime.enabled || runtime.port !== connection) return
  const notification = parseNativeNotification(method, params)
  switch (notification.method) {
    case "workerRoutingChanged": {
      const message = notification.params
      if (message.revision > runtime.workerRoutingRevision) {
        runtime.workerRoutingRevision = message.revision
        runtime.localCardIds = new Set(message.localCardIds)
        runtime.offlineWorkers = message.offlineWorkers
      }
      break
    }
    case "workspaceChanged": {
      const message = notification.params
      enqueueIncomingWorkspace(connection, () => applyWorkspaceChangePatch(message.patch), message.localCardIds, "Failed to apply the NewsNext Workspace update")
      break
    }
    case "collectionStatusChanged":
      if (runtime.collectionSubscribed) {
        runtime.collectionStatus = notification.params.status
        notifyDiagnostics()
      }
      break
    case "widgetCatalogChanged":
      void browser.runtime.sendMessage({ type: WIDGET_CATALOG_CHANGED }).catch(() => undefined)
      break
  }
}
