import type {
  ExtensionConnectionCommandRequest,
  ExtensionToHost,
  HostToExtension,
  NativeCommandResult,
  NativeExtensionBoard,
} from "@newsnext/extension-connection"
import type { PersistedDeviceState } from "../settings/persisted-settings"
import {
  parseExtensionConnectionCommandRequest,
} from "@newsnext/extension-connection"
import { browser } from "#imports"
import { normalizeApplicationData, PERSISTED_DATA_SLICES } from "../settings/persisted-data"
import {
  normalizePersistedDeviceState,
  withSourceConnectionEnabled,
} from "../settings/persisted-settings"
import { createBackgroundActionContext } from "./action-context"
import {
  actionRegistry,
  executeRegisteredAction,
} from "./action-registry"
import { readApplicationData } from "./application-service"
import { serializeSourceConnectionError } from "./source-connection-error"

const NATIVE_HOST_NAME = import.meta.env.DEV
  ? "app.newsnext.host.dev"
  : "app.newsnext.host"
const PROTOCOL_VERSION = 9
const SOURCE_CONNECTION_INSTANCE_ID_KEY = "newsnext.sourceConnectionInstanceId"
const SOURCE_CONNECTION_RECONNECT_ALARM = "source-connection-native-reconnect"
const RECONNECT_ALARM_PERIOD_MINUTES = 0.5
const WIDGET_REQUEST_TIMEOUT_MS = 65_000

export type SourceConnectionState
  = | "disabled"
    | "connected"
    | "connecting"
    | "disconnected"

export interface SourceConnectionStatus {
  cliVersion?: string
  state: SourceConnectionState
  widgetServerUrl?: string
}

type NativePort = ReturnType<typeof browser.runtime.connectNative>
type ParsedHostMessage
  = | Extract<HostToExtension, { type: "ready" }>
    | Extract<HostToExtension, { type: "error" }>
    | {
      type: "execute"
      request: ExtensionConnectionCommandRequest
    }
    | {
      type: "widgetSnapshotResult"
      requestId: string
      result: NativeCommandResult
    }

interface PendingWidgetSnapshotRequest {
  reject: (error: Error) => void
  resolve: (value: unknown) => void
  timeoutId: ReturnType<typeof setTimeout>
}

let port: NativePort | undefined
let cliVersion: string | undefined
let widgetServerUrl: string | undefined
let connectionState: SourceConnectionState = "disconnected"
let enabled = false
let instanceId = ""
let boards: NativeExtensionBoard[] = []
const pendingWidgetSnapshotRequests = new Map<string, PendingWidgetSnapshotRequest>()

const connectedActionContext = createBackgroundActionContext({
  getStatus: async () => getSourceConnectionStatus(),
  getWidgetSnapshot: requestWidgetSnapshot,
  setEnabled: async ({ enabled: nextEnabled, frontendState }) => (
    await setSourceConnectionEnabled(nextEnabled, frontendState)
  ),
})

function connectionBoards(value: unknown): NativeExtensionBoard[] {
  const application = normalizeApplicationData(value)
  const instances = new Map(application.instances.map(instance => [instance.instanceId, instance]))
  return application.boards.map(board => ({
    id: board.id,
    instances: board.instanceIds.flatMap((instanceId) => {
      const instance = instances.get(instanceId)
      return instance
        ? [{
            instanceId,
            ...(instance.patch.metadata === undefined ? {} : { metadata: instance.patch.metadata }),
            sourceId: instance.sourceId,
          }]
        : []
    }),
    name: board.name,
    widgets: board.nextLayer.widgets.map(widget => ({
      instanceIds: widget.dataScope.type === "board"
        ? [...board.instanceIds]
        : widget.dataScope.instanceIds.filter(instanceId => board.instanceIds.includes(instanceId)),
      widgetId: widget.widgetId,
    })),
  }))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function parseHostMessage(value: unknown): ParsedHostMessage {
  if (!isRecord(value) || typeof value.type !== "string") {
    throw new Error("The native host returned an invalid message")
  }
  if (
    value.type === "ready"
    && typeof value.protocolVersion === "number"
    && typeof value.daemonVersion === "string"
  ) {
    return {
      type: "ready",
      protocolVersion: value.protocolVersion,
      daemonVersion: value.daemonVersion,
      widgetServerUrl: parseWidgetServerUrl(value.widgetServerUrl),
    }
  }
  if (value.type === "execute") {
    return {
      type: "execute",
      request: parseExtensionConnectionCommandRequest(value.request),
    }
  }
  if (
    value.type === "widgetSnapshotResult"
    && typeof value.requestId === "string"
    && isNativeCommandResult(value.result)
  ) {
    return {
      type: "widgetSnapshotResult",
      requestId: value.requestId,
      result: value.result,
    }
  }
  if (
    value.type === "error"
    && (typeof value.requestId === "string" || value.requestId === null)
    && typeof value.message === "string"
  ) {
    return {
      type: "error",
      requestId: value.requestId,
      message: value.message,
    }
  }
  throw new Error("The native host returned an unsupported message")
}

function isNativeCommandResult(value: unknown): value is NativeCommandResult {
  if (!isRecord(value) || typeof value.ok !== "boolean") return false
  return value.ok ? true : isRecord(value.error) && typeof value.error.message === "string"
}

export function getSourceConnectionStatus(): SourceConnectionStatus {
  return {
    cliVersion,
    state: enabled ? connectionState : "disabled",
    widgetServerUrl,
  }
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
      error: serializeSourceConnectionError(error),
    }
  }

  if (!enabled || port !== connection) {
    return
  }
  const message: ExtensionToHost = {
    type: "complete",
    requestId: request.id,
    result,
  }
  connection.postMessage(message)
}

function disconnect(): void {
  port?.disconnect()
  port = undefined
  cliVersion = undefined
  widgetServerUrl = undefined
  connectionState = "disconnected"
  rejectPendingWidgetSnapshotRequests(new Error("NewsNext CLI disconnected"))
}

function connect(): void {
  if (!enabled || !instanceId || port) {
    return
  }

  connectionState = "connecting"
  cliVersion = undefined
  widgetServerUrl = undefined
  const nextPort = browser.runtime.connectNative(NATIVE_HOST_NAME)
  port = nextPort
  nextPort.onDisconnect.addListener(() => {
    if (port === nextPort) {
      port = undefined
      cliVersion = undefined
      widgetServerUrl = undefined
      connectionState = "disconnected"
      rejectPendingWidgetSnapshotRequests(new Error("NewsNext CLI disconnected"))
    }
  })
  nextPort.onMessage.addListener((value: unknown) => {
    if (!enabled || port !== nextPort) {
      return
    }
    try {
      const message = parseHostMessage(value)
      if (message.type === "ready") {
        if (message.protocolVersion !== PROTOCOL_VERSION) {
          throw new Error(`Unsupported native protocol version ${message.protocolVersion}`)
        }
        cliVersion = message.daemonVersion
        widgetServerUrl = message.widgetServerUrl
        connectionState = "connected"
      } else if (message.type === "execute") {
        void executeCommand(nextPort, message.request).catch((error) => {
          console.error("Failed to return native source connection result", error)
        })
      } else if (message.type === "widgetSnapshotResult") {
        settleWidgetRequest(message.requestId, message.result)
      } else {
        if (message.requestId) {
          const pending = pendingWidgetSnapshotRequests.get(message.requestId)
          if (pending) {
            clearTimeout(pending.timeoutId)
            pendingWidgetSnapshotRequests.delete(message.requestId)
            pending.reject(new Error(message.message))
            return
          }
        }
        console.error("NewsNext native host error", message.message)
      }
    } catch (error) {
      console.error("Failed to process NewsNext native host message", error)
      disconnect()
    }
  })

  const hello: ExtensionToHost = {
    type: "hello",
    protocolVersion: PROTOCOL_VERSION,
    instance: {
      id: instanceId,
      browser: import.meta.env.BROWSER,
      extensionVersion: browser.runtime.getManifest().version,
      boards,
    },
  }
  nextPort.postMessage(hello)
}

export async function requestWidgetSnapshot(input: {
  boardId: string
  widgetId: string
}): Promise<unknown> {
  const connection = port
  if (!enabled || connectionState !== "connected" || !connection) {
    throw new Error("NewsNext CLI is not connected")
  }
  const message: ExtensionToHost = {
    type: "widgetSnapshotGet",
    requestId: crypto.randomUUID(),
    ...input,
  }
  return await new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingWidgetSnapshotRequests.delete(message.requestId)
      reject(new Error("Timed out waiting for the NewsNext CLI"))
    }, WIDGET_REQUEST_TIMEOUT_MS)
    pendingWidgetSnapshotRequests.set(message.requestId, { reject, resolve, timeoutId })
    connection.postMessage(message)
  })
}

function settleWidgetRequest(requestId: string, result: NativeCommandResult): void {
  const pending = pendingWidgetSnapshotRequests.get(requestId)
  if (!pending) return
  clearTimeout(pending.timeoutId)
  pendingWidgetSnapshotRequests.delete(requestId)
  if (result.ok) {
    pending.resolve(result.data)
  } else {
    pending.reject(new Error(result.error.message))
  }
}

function rejectPendingWidgetSnapshotRequests(error: Error): void {
  for (const pending of pendingWidgetSnapshotRequests.values()) {
    clearTimeout(pending.timeoutId)
    pending.reject(error)
  }
  pendingWidgetSnapshotRequests.clear()
}

function parseWidgetServerUrl(value: unknown): string {
  if (typeof value !== "string") {
    throw new TypeError("The native host returned an invalid widget server URL")
  }
  const url = new URL(value)
  if (
    url.protocol !== "http:"
    || url.hostname !== "127.0.0.1"
    || !url.port
    || url.username
    || url.password
    || url.pathname !== "/"
    || url.search
    || url.hash
  ) {
    throw new Error("The native host widget server must use a loopback HTTP origin")
  }
  return url.origin
}

async function applySourceConnectionEnabled(nextEnabled: boolean): Promise<void> {
  if (enabled === nextEnabled) {
    return
  }

  enabled = nextEnabled
  if (enabled) {
    browser.alarms.create(SOURCE_CONNECTION_RECONNECT_ALARM, {
      periodInMinutes: RECONNECT_ALARM_PERIOD_MINUTES,
    })
    connect()
    return
  }

  disconnect()
  await browser.alarms.clear(SOURCE_CONNECTION_RECONNECT_ALARM)
}

export async function setSourceConnectionEnabled(
  nextEnabled: boolean,
  frontendState?: PersistedDeviceState,
): Promise<SourceConnectionStatus> {
  const stored = await browser.storage.local.get(PERSISTED_DATA_SLICES.deviceState.key)
  const state = normalizePersistedDeviceState(
    stored[PERSISTED_DATA_SLICES.deviceState.key] ?? frontendState,
  )
  await browser.storage.local.set({
    [PERSISTED_DATA_SLICES.deviceState.key]: withSourceConnectionEnabled(
      state,
      nextEnabled,
    ),
  })
  await applySourceConnectionEnabled(nextEnabled)
  return getSourceConnectionStatus()
}

export async function registerSourceConnectionNative(): Promise<void> {
  browser.alarms.onAlarm.addListener((alarm) => {
    if (
      enabled
      && alarm.name === SOURCE_CONNECTION_RECONNECT_ALARM
      && connectionState === "disconnected"
    ) {
      connect()
    }
  })
  browser.storage.onChanged.addListener((changes, areaName) => {
    const applicationChange = changes[PERSISTED_DATA_SLICES.application.key]
    if (areaName === "local" && applicationChange) {
      boards = connectionBoards(applicationChange.newValue)
      if (port) {
        const message: ExtensionToHost = { type: "boardsChanged", boards }
        port.postMessage(message)
      }
    }
    const change = changes[PERSISTED_DATA_SLICES.deviceState.key]
    if (areaName === "local" && change) {
      const state = normalizePersistedDeviceState(change.newValue)
      void applySourceConnectionEnabled(state.sourceConnectionEnabled)
    }
  })

  const stored = await browser.storage.local.get([
    PERSISTED_DATA_SLICES.deviceState.key,
    SOURCE_CONNECTION_INSTANCE_ID_KEY,
  ])
  const application = await readApplicationData()
  const storedInstanceId = stored[SOURCE_CONNECTION_INSTANCE_ID_KEY]
  instanceId = typeof storedInstanceId === "string" && storedInstanceId
    ? storedInstanceId
    : crypto.randomUUID()
  if (instanceId !== storedInstanceId) {
    await browser.storage.local.set({ [SOURCE_CONNECTION_INSTANCE_ID_KEY]: instanceId })
  }
  const persisted = stored[PERSISTED_DATA_SLICES.deviceState.key]
  boards = connectionBoards(application)
  const state = normalizePersistedDeviceState(persisted)
  enabled = state.sourceConnectionEnabled
  if (enabled) {
    browser.alarms.create(SOURCE_CONNECTION_RECONNECT_ALARM, {
      periodInMinutes: RECONNECT_ALARM_PERIOD_MINUTES,
    })
    connect()
  } else {
    await browser.alarms.clear(SOURCE_CONNECTION_RECONNECT_ALARM)
  }
}
