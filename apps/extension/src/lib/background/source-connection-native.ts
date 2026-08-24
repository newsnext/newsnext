import type {
  ExtensionConnectionCommandRequest,
  ExtensionToHost,
  HostToExtension,
  NativeCommandResult,
  NativeWorkspace,
} from "@newsnext/extension-connection"
import type { PersistedDeviceState } from "../settings/persisted-settings"
import type { SourceLoadResponse } from "../source/load-result"
import {
  parseExtensionConnectionCommandRequest,
} from "@newsnext/extension-connection"
import { browser } from "#imports"
import { APPLICATION_DATA_VERSION } from "../application"
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
import {
  mirrorApplicationData,
  readApplicationData,
  setApplicationDataCommitter,
} from "./application-service"
import { serializeSourceConnectionError } from "./source-connection-error"

const NATIVE_HOST_NAME = import.meta.env.DEV
  ? "app.newsnext.host.dev"
  : "app.newsnext.host"
const PROTOCOL_VERSION = 13
const SOURCE_CONNECTION_NODE_ID_KEY = "newsnext.sourceConnectionNodeId"
const SOURCE_CONNECTION_LOCAL_INSTANCE_IDS_KEY = "newsnext.sourceConnectionLocalInstanceIds"
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
      localInstanceIds: string[]
    }
    | {
      type: "workspaceResult"
      requestId: string
      workspace: NativeWorkspace
      localInstanceIds: string[]
    }
    | {
      type: "instanceResult"
      requestId: string
      result: NativeCommandResult
    }

interface PendingWidgetSnapshotRequest {
  reject: (error: Error) => void
  resolve: (value: unknown) => void
  timeoutId: ReturnType<typeof setTimeout>
}

interface PendingInstanceRequest {
  cacheOnly: boolean
  reject: (error: Error) => void
  resolve: (value: SourceLoadResponse | null) => void
  timeoutId: ReturnType<typeof setTimeout>
}

interface PendingWorkspaceRequest {
  reject: (error: Error) => void
  resolve: (value: NativeWorkspace) => void
  timeoutId: ReturnType<typeof setTimeout>
}

let port: NativePort | undefined
let cliVersion: string | undefined
let widgetServerUrl: string | undefined
let connectionState: SourceConnectionState = "disconnected"
let enabled = false
let nodeId = ""
let workspace: NativeWorkspace = { revision: 0, boards: [], instances: [] }
let localInstanceIds = new Set<string>()
let bootstrapBindings: Array<{ instanceId: string, nodeId: string }> = []
const pendingWidgetSnapshotRequests = new Map<string, PendingWidgetSnapshotRequest>()
const pendingInstanceRequests = new Map<string, PendingInstanceRequest>()
const pendingWorkspaceRequests = new Map<string, PendingWorkspaceRequest>()

const connectedActionContext = createBackgroundActionContext({
  getStatus: async () => getSourceConnectionStatus(),
  getWidgetSnapshot: requestWidgetSnapshot,
  loadInstance: requestInstanceLoad,
  readInstanceCache: requestInstanceCache,
  setEnabled: async ({ enabled: nextEnabled, frontendState }) => (
    await setSourceConnectionEnabled(nextEnabled, frontendState)
  ),
})

function connectionWorkspace(value: unknown, revision: number): NativeWorkspace {
  const application = normalizeApplicationData(value)
  return {
    revision,
    boards: application.boards,
    instances: application.instances,
  }
}

function createBootstrapWorkspace(
  applicationValue: unknown,
  currentNodeId: string,
): NativeWorkspace {
  const application = normalizeApplicationData(applicationValue)
  bootstrapBindings = application.instances.map(instance => ({
    instanceId: instance.instanceId,
    nodeId: currentNodeId,
  }))
  return {
    revision: 0,
    boards: application.boards,
    instances: application.instances,
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
  const application = normalizeApplicationData({
    version: APPLICATION_DATA_VERSION,
    boards: value.boards,
    instances: value.instances,
  })
  return {
    revision: Number(value.revision),
    boards: application.boards,
    instances: application.instances,
  }
}

function parseLocalInstanceIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.some(id => typeof id !== "string" || !id)) {
    throw new Error("The native host returned invalid local Instance bindings")
  }
  return [...new Set(value)]
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
      localInstanceIds: parseLocalInstanceIds(value.localInstanceIds),
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
      localInstanceIds: parseLocalInstanceIds(value.localInstanceIds),
    }
  }
  if (value.type === "workspaceResult" && typeof value.requestId === "string") {
    return {
      type: "workspaceResult",
      requestId: value.requestId,
      workspace: parseWorkspace(value.workspace),
      localInstanceIds: parseLocalInstanceIds(value.localInstanceIds),
    }
  }
  if (
    value.type === "instanceResult"
    && typeof value.requestId === "string"
    && isNativeCommandResult(value.result)
  ) {
    return {
      type: "instanceResult",
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
  rejectPendingInstanceRequests(new Error("NewsNext CLI disconnected"))
  rejectPendingWorkspaceRequests(new Error("NewsNext CLI disconnected"))
}

async function applyWorkspace(
  nextWorkspace: NativeWorkspace,
  nextLocalInstanceIds: string[],
): Promise<void> {
  const application = acceptWorkspace(nextWorkspace, nextLocalInstanceIds)
  const current = await readApplicationData()
  if (JSON.stringify(current) === JSON.stringify(application)) return
  await mirrorApplicationData(application)
}

function acceptWorkspace(
  nextWorkspace: NativeWorkspace,
  nextLocalInstanceIds: string[],
) {
  workspace = nextWorkspace
  localInstanceIds = new Set(nextLocalInstanceIds)
  void browser.storage.local.set({
    [SOURCE_CONNECTION_LOCAL_INSTANCE_IDS_KEY]: nextLocalInstanceIds,
  })
  return normalizeApplicationData({
    version: APPLICATION_DATA_VERSION,
    boards: nextWorkspace.boards,
    instances: nextWorkspace.instances,
  })
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
      rejectPendingInstanceRequests(new Error("NewsNext CLI disconnected"))
      rejectPendingWorkspaceRequests(new Error("NewsNext CLI disconnected"))
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
        void applyWorkspace(message.workspace, message.localInstanceIds).catch((error) => {
          console.error("Failed to apply the NewsNext Workspace", error)
        })
      } else if (message.type === "execute") {
        void executeCommand(nextPort, message.request).catch((error) => {
          console.error("Failed to return native source connection result", error)
        })
      } else if (message.type === "widgetSnapshotResult") {
        settleWidgetRequest(message.requestId, message.result)
      } else if (message.type === "workspaceChanged") {
        void applyWorkspace(message.workspace, message.localInstanceIds).catch((error) => {
          console.error("Failed to apply the NewsNext Workspace update", error)
        })
      } else if (message.type === "workspaceResult") {
        acceptWorkspace(message.workspace, message.localInstanceIds)
        settleWorkspaceRequest(message.requestId, message.workspace)
      } else if (message.type === "instanceResult") {
        settleInstanceRequest(message.requestId, message.result)
      } else {
        if (message.requestId) {
          const pending = pendingWidgetSnapshotRequests.get(message.requestId)
          if (pending) {
            clearTimeout(pending.timeoutId)
            pendingWidgetSnapshotRequests.delete(message.requestId)
            pending.reject(new Error(message.message))
            return
          }
          const instanceRequest = pendingInstanceRequests.get(message.requestId)
          if (instanceRequest) {
            clearTimeout(instanceRequest.timeoutId)
            pendingInstanceRequests.delete(message.requestId)
            instanceRequest.reject(new Error(message.message))
            return
          }
          const workspaceRequest = pendingWorkspaceRequests.get(message.requestId)
          if (workspaceRequest) {
            clearTimeout(workspaceRequest.timeoutId)
            pendingWorkspaceRequests.delete(message.requestId)
            workspaceRequest.reject(new Error(message.message))
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
    },
    workspace,
    bindings: bootstrapBindings,
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
  const result = await requestInstance(input, false)
  if (!result) throw new Error("The NewsNext Node returned an empty Source result")
  return result
}

export async function requestInstanceCache(input: { instanceId: string }): Promise<SourceLoadResponse | null> {
  return await requestInstance(input, true)
}

async function requestInstance(
  input: { instanceId: string },
  cacheOnly: boolean,
): Promise<SourceLoadResponse | null> {
  if (localInstanceIds.has(input.instanceId)) {
    const instance = workspace.instances.find(candidate => candidate.instanceId === input.instanceId)
    if (!instance) throw new Error(`Instance '${input.instanceId}' not found`)
    const result = await executeRegisteredAction(
      cacheOnly ? "loader.readInstanceCache" : "loader.loadInstance",
      { instance },
      "connected",
      connectedActionContext,
      crypto.randomUUID(),
    )
    if (result === null && cacheOnly) return null
    if (!isSourceLoadResponse(result)) {
      throw new Error("The current browser returned an invalid Source result")
    }
    return result
  }
  const connection = port
  if (!enabled || connectionState !== "connected" || !connection) {
    throw new Error("NewsNext CLI is not connected")
  }
  const message: ExtensionToHost = {
    type: "instanceGet",
    requestId: crypto.randomUUID(),
    instanceId: input.instanceId,
    cacheOnly,
  }
  return await new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingInstanceRequests.delete(message.requestId)
      reject(new Error("Timed out waiting for the Instance's NewsNext Node"))
    }, WIDGET_REQUEST_TIMEOUT_MS)
    pendingInstanceRequests.set(message.requestId, {
      cacheOnly,
      reject,
      resolve,
      timeoutId,
    })
    connection.postMessage(message)
  })
}

async function requestWorkspaceReplacement(candidate: NativeWorkspace): Promise<NativeWorkspace> {
  const connection = port
  if (!enabled || connectionState !== "connected" || !connection) {
    throw new Error("NewsNext CLI is not connected")
  }
  const message: ExtensionToHost = {
    type: "workspaceChanged",
    requestId: crypto.randomUUID(),
    workspace: candidate,
  }
  return await new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingWorkspaceRequests.delete(message.requestId)
      reject(new Error("Timed out waiting for the NewsNext Workspace commit"))
    }, WIDGET_REQUEST_TIMEOUT_MS)
    pendingWorkspaceRequests.set(message.requestId, { reject, resolve, timeoutId })
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

function settleInstanceRequest(requestId: string, result: NativeCommandResult): void {
  const pending = pendingInstanceRequests.get(requestId)
  if (!pending) return
  clearTimeout(pending.timeoutId)
  pendingInstanceRequests.delete(requestId)
  if (result.ok) {
    if (result.data === null && pending.cacheOnly) {
      pending.resolve(null)
      return
    }
    if (!isSourceLoadResponse(result.data)) {
      pending.reject(new Error("The NewsNext Node returned an invalid Source result"))
      return
    }
    pending.resolve(result.data)
  } else {
    pending.reject(new Error(result.error.message))
  }
}

function settleWorkspaceRequest(requestId: string, committed: NativeWorkspace): void {
  const pending = pendingWorkspaceRequests.get(requestId)
  if (!pending) return
  clearTimeout(pending.timeoutId)
  pendingWorkspaceRequests.delete(requestId)
  pending.resolve(committed)
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

function rejectPendingInstanceRequests(error: Error): void {
  for (const pending of pendingInstanceRequests.values()) {
    clearTimeout(pending.timeoutId)
    pending.reject(error)
  }
  pendingInstanceRequests.clear()
}

function rejectPendingWorkspaceRequests(error: Error): void {
  for (const pending of pendingWorkspaceRequests.values()) {
    clearTimeout(pending.timeoutId)
    pending.reject(error)
  }
  pendingWorkspaceRequests.clear()
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
  setApplicationDataCommitter(async (application) => {
    const committed = await requestWorkspaceReplacement(
      connectionWorkspace(application, workspace.revision),
    )
    return normalizeApplicationData({
      version: APPLICATION_DATA_VERSION,
      boards: committed.boards,
      instances: committed.instances,
    })
  })
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
    const change = changes[PERSISTED_DATA_SLICES.deviceState.key]
    if (areaName === "local" && change) {
      const state = normalizePersistedDeviceState(change.newValue)
      void applySourceConnectionEnabled(state.sourceConnectionEnabled)
    }
  })

  const stored = await browser.storage.local.get([
    PERSISTED_DATA_SLICES.deviceState.key,
    SOURCE_CONNECTION_NODE_ID_KEY,
    SOURCE_CONNECTION_LOCAL_INSTANCE_IDS_KEY,
  ])
  const application = await readApplicationData()
  const storedNodeId = stored[SOURCE_CONNECTION_NODE_ID_KEY]
  nodeId = typeof storedNodeId === "string" && storedNodeId
    ? storedNodeId
    : crypto.randomUUID()
  if (nodeId !== storedNodeId) {
    await browser.storage.local.set({ [SOURCE_CONNECTION_NODE_ID_KEY]: nodeId })
  }
  localInstanceIds = new Set(parseLocalInstanceIds(
    stored[SOURCE_CONNECTION_LOCAL_INSTANCE_IDS_KEY] ?? [],
  ))
  const persisted = stored[PERSISTED_DATA_SLICES.deviceState.key]
  workspace = createBootstrapWorkspace(application, nodeId)
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
