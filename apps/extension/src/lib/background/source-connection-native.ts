import type {
  ExtensionConnectionCommandRequest,
  ExtensionToHost,
  HostToExtension,
  NativeCommandResult,
  NativeNode,
  NativeWorkspace,
} from "@newsnext/extension-connection"
import type { PersistedDeviceState } from "../settings/persisted-settings"
import type { SourceLoadResponse } from "../source/load-result"
import {
  parseExtensionConnectionCommandRequest,
} from "@newsnext/extension-connection"
import { browser } from "#imports"
import { NODES_STORAGE_KEY, normalizeNodes } from "../node"
import { normalizeApplicationData, normalizeBoards, PERSISTED_DATA_SLICES } from "../settings/persisted-data"
import {
  normalizePersistedDeviceState,
  withSourceConnectionEnabled,
} from "../settings/persisted-settings"
import { createBackgroundActionContext } from "./action-context"
import {
  actionRegistry,
  executeRegisteredAction,
} from "./action-registry"
import { readApplicationData, replaceApplicationData } from "./application-service"
import { serializeSourceConnectionError } from "./source-connection-error"

const NATIVE_HOST_NAME = import.meta.env.DEV
  ? "app.newsnext.host.dev"
  : "app.newsnext.host"
const PROTOCOL_VERSION = 11
const SOURCE_CONNECTION_NODE_ID_KEY = "newsnext.sourceConnectionNodeId"
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
    | {
      type: "workspaceChanged"
      workspace: NativeWorkspace
    }
    | {
      type: "nodesChanged"
      nodes: NativeNode[]
    }
    | {
      type: "instanceLoadResult"
      requestId: string
      result: NativeCommandResult
    }

interface PendingWidgetSnapshotRequest {
  reject: (error: Error) => void
  resolve: (value: unknown) => void
  timeoutId: ReturnType<typeof setTimeout>
}

interface PendingInstanceLoadRequest {
  reject: (error: Error) => void
  resolve: (value: SourceLoadResponse) => void
  timeoutId: ReturnType<typeof setTimeout>
}

let port: NativePort | undefined
let cliVersion: string | undefined
let widgetServerUrl: string | undefined
let connectionState: SourceConnectionState = "disconnected"
let enabled = false
let nodeId = ""
let nodeState: Pick<NativeNode, "instances"> = { instances: [] }
let synchronizedInstances = ""
let workspace: NativeWorkspace = { revision: 0, boards: [] }
let synchronizedBoards = ""
let cachedNodes: NativeNode[] = []
const pendingWidgetSnapshotRequests = new Map<string, PendingWidgetSnapshotRequest>()
const pendingInstanceLoadRequests = new Map<string, PendingInstanceLoadRequest>()

const connectedActionContext = createBackgroundActionContext({
  getStatus: async () => getSourceConnectionStatus(),
  getWidgetSnapshot: requestWidgetSnapshot,
  loadInstance: requestInstanceLoad,
  setEnabled: async ({ enabled: nextEnabled, frontendState }) => (
    await setSourceConnectionEnabled(nextEnabled, frontendState)
  ),
})

function connectionNode(value: unknown): Pick<NativeNode, "instances"> {
  const application = normalizeApplicationData(value)
  return {
    instances: application.instances.map(instance => ({
      createdAt: instance.createdAt,
      instanceId: instance.instanceId,
      patch: instance.patch,
      sourceId: instance.sourceId,
    })),
  }
}

function connectionWorkspace(value: unknown, revision: number): NativeWorkspace {
  return {
    revision,
    boards: normalizeApplicationData(value).boards,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function parseWorkspace(value: unknown): NativeWorkspace {
  if (!isRecord(value)
    || !Number.isSafeInteger(value.revision)
    || Number(value.revision) < 0) {
    throw new Error("The native host returned an invalid Workspace")
  }
  return {
    revision: Number(value.revision),
    boards: normalizeBoards(value.boards),
  }
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
      workspace: parseWorkspace(value.workspace),
      nodes: normalizeNodes(value.nodes),
    }
  }
  if (value.type === "execute") {
    return {
      type: "execute",
      request: parseExtensionConnectionCommandRequest(value.request),
    }
  }
  if (value.type === "workspaceChanged") {
    return {
      type: "workspaceChanged",
      workspace: parseWorkspace(value.workspace),
    }
  }
  if (value.type === "nodesChanged") {
    return { type: "nodesChanged", nodes: normalizeNodes(value.nodes) }
  }
  if (
    value.type === "instanceLoadResult"
    && typeof value.requestId === "string"
    && isNativeCommandResult(value.result)
  ) {
    return {
      type: "instanceLoadResult",
      requestId: value.requestId,
      result: value.result,
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
  rejectPendingInstanceLoadRequests(new Error("NewsNext CLI disconnected"))
}

function cacheNodes(nodes: NativeNode[]): void {
  const nodesById = new Map(cachedNodes.map(node => [node.id, node]))
  nodes.forEach(node => nodesById.set(node.id, node))
  cachedNodes = [...nodesById.values()]
  void browser.storage.local.set({ [NODES_STORAGE_KEY]: cachedNodes })
}

async function applyWorkspace(nextWorkspace: NativeWorkspace): Promise<void> {
  workspace = nextWorkspace
  const boards = normalizeBoards(nextWorkspace.boards)
  synchronizedBoards = JSON.stringify(boards)
  const application = await readApplicationData()
  if (JSON.stringify(application.boards) === synchronizedBoards) return
  await replaceApplicationData({ ...application, boards })
}

function connect(): void {
  if (!enabled || !nodeId || port) {
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
      rejectPendingInstanceLoadRequests(new Error("NewsNext CLI disconnected"))
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
        cacheNodes(message.nodes)
        void applyWorkspace(message.workspace).catch((error) => {
          console.error("Failed to apply the NewsNext Workspace", error)
        })
      } else if (message.type === "execute") {
        void executeCommand(nextPort, message.request).catch((error) => {
          console.error("Failed to return native source connection result", error)
        })
      } else if (message.type === "widgetSnapshotResult") {
        settleWidgetRequest(message.requestId, message.result)
      } else if (message.type === "workspaceChanged") {
        void applyWorkspace(message.workspace).catch((error) => {
          console.error("Failed to apply the NewsNext Workspace update", error)
        })
      } else if (message.type === "nodesChanged") {
        cacheNodes(message.nodes)
      } else if (message.type === "instanceLoadResult") {
        settleInstanceLoadRequest(message.requestId, message.result)
      } else {
        if (message.requestId) {
          const pending = pendingWidgetSnapshotRequests.get(message.requestId)
          if (pending) {
            clearTimeout(pending.timeoutId)
            pendingWidgetSnapshotRequests.delete(message.requestId)
            pending.reject(new Error(message.message))
            return
          }
          const instanceLoad = pendingInstanceLoadRequests.get(message.requestId)
          if (instanceLoad) {
            clearTimeout(instanceLoad.timeoutId)
            pendingInstanceLoadRequests.delete(message.requestId)
            instanceLoad.reject(new Error(message.message))
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
    node: {
      id: nodeId,
      browser: import.meta.env.BROWSER,
      extensionVersion: browser.runtime.getManifest().version,
      ...nodeState,
    },
    workspace,
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

export async function requestInstanceLoad(input: { instanceId: string }): Promise<SourceLoadResponse> {
  const connection = port
  if (!enabled || connectionState !== "connected" || !connection) {
    throw new Error("NewsNext CLI is not connected")
  }
  const message: ExtensionToHost = {
    type: "instanceLoadGet",
    requestId: crypto.randomUUID(),
    instanceId: input.instanceId,
  }
  return await new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingInstanceLoadRequests.delete(message.requestId)
      reject(new Error("Timed out waiting for the Instance's NewsNext Node"))
    }, WIDGET_REQUEST_TIMEOUT_MS)
    pendingInstanceLoadRequests.set(message.requestId, { reject, resolve, timeoutId })
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

function settleInstanceLoadRequest(requestId: string, result: NativeCommandResult): void {
  const pending = pendingInstanceLoadRequests.get(requestId)
  if (!pending) return
  clearTimeout(pending.timeoutId)
  pendingInstanceLoadRequests.delete(requestId)
  if (result.ok) {
    if (!isSourceLoadResponse(result.data)) {
      pending.reject(new Error("The NewsNext Node returned an invalid Source result"))
      return
    }
    pending.resolve(result.data)
  } else {
    pending.reject(new Error(result.error.message))
  }
}

function isSourceLoadResponse(value: unknown): value is SourceLoadResponse {
  return isRecord(value)
    && typeof value.fetchProtected === "boolean"
    && typeof value.fetchedAt === "number"
    && typeof value.loadedAt === "number"
    && isRecord(value.params)
    && isRecord(value.result)
}

function rejectPendingWidgetSnapshotRequests(error: Error): void {
  for (const pending of pendingWidgetSnapshotRequests.values()) {
    clearTimeout(pending.timeoutId)
    pending.reject(error)
  }
  pendingWidgetSnapshotRequests.clear()
}

function rejectPendingInstanceLoadRequests(error: Error): void {
  for (const pending of pendingInstanceLoadRequests.values()) {
    clearTimeout(pending.timeoutId)
    pending.reject(error)
  }
  pendingInstanceLoadRequests.clear()
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
    const nodesChange = changes[NODES_STORAGE_KEY]
    if (areaName === "local" && nodesChange?.newValue === undefined) {
      cachedNodes = []
    }
    const applicationChange = changes[PERSISTED_DATA_SLICES.application.key]
    if (areaName === "local" && applicationChange) {
      nodeState = connectionNode(applicationChange.newValue)
      const nextInstances = JSON.stringify(nodeState.instances)
      if (port && nextInstances !== synchronizedInstances) {
        synchronizedInstances = nextInstances
        const message: ExtensionToHost = { type: "nodeChanged", instances: nodeState.instances }
        port.postMessage(message)
      }
      const nextWorkspace = connectionWorkspace(applicationChange.newValue, workspace.revision)
      const nextBoards = JSON.stringify(nextWorkspace.boards)
      if (port && nextBoards !== synchronizedBoards) {
        workspace = nextWorkspace
        const message: ExtensionToHost = { type: "workspaceChanged", workspace }
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
    NODES_STORAGE_KEY,
    SOURCE_CONNECTION_NODE_ID_KEY,
  ])
  const application = await readApplicationData()
  const storedNodeId = stored[SOURCE_CONNECTION_NODE_ID_KEY]
  nodeId = typeof storedNodeId === "string" && storedNodeId
    ? storedNodeId
    : crypto.randomUUID()
  if (nodeId !== storedNodeId) {
    await browser.storage.local.set({ [SOURCE_CONNECTION_NODE_ID_KEY]: nodeId })
  }
  const persisted = stored[PERSISTED_DATA_SLICES.deviceState.key]
  cachedNodes = normalizeNodes(stored[NODES_STORAGE_KEY])
  nodeState = connectionNode(application)
  synchronizedInstances = JSON.stringify(nodeState.instances)
  workspace = connectionWorkspace(application, 0)
  synchronizedBoards = JSON.stringify(workspace.boards)
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
