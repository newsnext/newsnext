import type {
  ExtensionConnectionCommandRequest,
  ExtensionToHost,
  HostToExtension,
  NativeCommandResult,
  NativeIllustration,
  NativeLogEntry,
  NativeOfflineWorker,
  NativeWorkspace,
  NativeWorkspacePatch,
} from "@newsnext/extension-connection"
import type { AppIntegrationFailureState } from "../app-integration-connection"
import type { SourceLoadResponse } from "../source/load-result"
import type { AppIntegrationActions } from "./action-context"
import {
  parseExtensionConnectionCommandRequest,
} from "@newsnext/extension-connection"
import { browser } from "#imports"
import {
  classifyAppIntegrationFailure,
  getAppIntegrationReconnectDelay,
  isVersionAtLeast,
  MINIMUM_DAEMON_VERSION,
} from "../app-integration-connection"
import { APP_INTEGRATION_PERMISSIONS } from "../app-integration-permission"
import { APPLICATION_DATA_VERSION } from "../application"
import {
  readPersistedBgIllustrationBytes,
  writePersistedBgIllustration,
} from "../bg-illustration"
import { normalizeApplicationData, PERSISTED_DATA_SLICES } from "../settings/persisted-data"
import {
  normalizePersistedSettings,
  withAppIntegrationEnabled,
} from "../settings/persisted-settings"
import { createBackgroundActionContext } from "./action-context"
import {
  actionRegistry,
  executeRegisteredAction,
} from "./action-registry"
import { serializeAppIntegrationError } from "./app-integration-error"
import {
  mirrorApplicationData,
  readApplicationData,
  setApplicationDataCommitter,
} from "./application-service"
import { NativeMessageChunkAssembler } from "./native-message-chunks"
import { applyWorkspacePatch, createWorkspacePatch } from "./workspace-patch"

const NATIVE_HOST_NAME = import.meta.env.DEV
  ? "app.newsnext.host.dev"
  : "app.newsnext.host"
const PROTOCOL_VERSION = 18
const APP_INTEGRATION_WORKER_ID_KEY = "newsnext-app-integration-worker-id"
const APP_INTEGRATION_RECONNECT_ALARM = "app-integration-native-reconnect"
const RECONNECT_ALARM_PERIOD_MINUTES = 0.5
const NATIVE_REQUEST_TIMEOUT_MS = 65_000

export type AppIntegrationState
  = | "disabled"
    | "connected"
    | "connecting"
    | AppIntegrationFailureState

export interface AppIntegrationStatus {
  appVersion?: string
  capabilities: string[]
  offlineWorkers: NativeOfflineWorker[]
  connectionError?: AppIntegrationConnectionError
  state: AppIntegrationState
  workerId: string
  widgetServerUrl?: string
}

export interface AppIntegrationConnectionError {
  code?: string
  message: string
}

type NativePort = ReturnType<typeof browser.runtime.connectNative>
type ReadyHostMessage = Extract<HostToExtension, { type: "ready" }> & { capabilities: string[] }
type ParsedHostMessage
  = | Exclude<HostToExtension, { type: "chunk" | "ready" }>
    | ReadyHostMessage

interface PendingRequest {
  reject: (error: Error) => void
  timeoutId: ReturnType<typeof setTimeout>
}

interface PendingWidgetSnapshotRequest extends PendingRequest {
  resolve: (value: unknown) => void
}

interface PendingInstanceRequest extends PendingRequest {
  cacheOnly: boolean
  resolve: (value: SourceLoadResponse | null) => void
}

interface PendingWorkspaceRequest extends PendingRequest {
  candidate: NativeWorkspace
  resolve: (value: NativeWorkspace) => void
}

interface PendingIllustrationGetRequest extends PendingRequest {
  id: string
  resolve: (value: Uint8Array<ArrayBuffer> | null) => void
}

interface PendingLogsRequest extends PendingRequest {
  resolve: (logs: NativeLogEntry[]) => void
}

interface PendingIllustrationPutRequest extends PendingRequest {
  id: string
  resolve: () => void
}

interface PendingConnectionRequest extends PendingRequest {
  resolve: (connection: NativePort) => void
}

interface PendingWorkerTakeoverRequest extends PendingRequest {
  resolve: () => void
}

let port: NativePort | undefined
let appVersion: string | undefined
let capabilities: string[] = []
let widgetServerUrl: string | undefined
let connectionState: AppIntegrationState = "serviceNotRunning"
let connectionError: AppIntegrationStatus["connectionError"]
let enabled = false
let workerId: string = crypto.randomUUID()
let workerRoutingRevision = 0
let offlineWorkers: NativeOfflineWorker[] = []
let workspace: NativeWorkspace = { revision: 0, boards: [], instances: [] }
let localInstanceIds = new Set<string>()
let bootstrapBindings: Array<{ instanceId: string, workerId: string }> = []
const pendingWidgetSnapshotRequests = new Map<string, PendingWidgetSnapshotRequest>()
const pendingInstanceRequests = new Map<string, PendingInstanceRequest>()
const pendingWorkspaceRequests = new Map<string, PendingWorkspaceRequest>()
const pendingIllustrationGetRequests = new Map<string, PendingIllustrationGetRequest>()
const pendingIllustrationPutRequests = new Map<string, PendingIllustrationPutRequest>()
const pendingLogsRequests = new Map<string, PendingLogsRequest>()
const pendingConnectionRequests = new Set<PendingConnectionRequest>()
const pendingWorkerTakeoverRequests = new Map<string, PendingWorkerTakeoverRequest>()
const activeIllustrationRequests = new Map<string, Promise<Uint8Array<ArrayBuffer> | null>>()
const nativeMessageChunks = new NativeMessageChunkAssembler(NATIVE_REQUEST_TIMEOUT_MS)
let reconnectAttempt = 0
let reconnectTimer: ReturnType<typeof setTimeout> | undefined

export const appIntegrationActions: AppIntegrationActions = {
  getIllustration: requestIllustration,
  getLogs: requestLogs,
  getStatus: async () => getAppIntegrationStatus(),
  getWidgetSnapshot: requestWidgetSnapshot,
  loadInstance: requestInstanceLoad,
  readInstanceCache: requestInstanceCache,
  putIllustration: storeIllustration,
  regenerateWorker: regenerateAppIntegrationWorker,
  setEnabled: async ({ enabled: nextEnabled }) => (
    await setAppIntegrationEnabled(nextEnabled)
  ),
  takeOverWorker: async ({ instanceIds, workerId: sourceWorkerId }) => (
    await takeOverAppIntegrationWorker(sourceWorkerId, instanceIds)
  ),
}

const connectedActionContext = createBackgroundActionContext(appIntegrationActions)

function createWorkspace(value: unknown, revision: number): NativeWorkspace {
  const application = normalizeApplicationData(value)
  return {
    revision,
    boards: application.boards,
    instances: application.instances,
  }
}

function createLocalBindings(
  instances: NativeWorkspace["instances"],
  currentWorkerId: string,
): Array<{ instanceId: string, workerId: string }> {
  return instances.map(instance => ({
    instanceId: instance.instanceId,
    workerId: currentWorkerId,
  }))
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

function parseWorkspacePatch(value: unknown): NativeWorkspacePatch {
  if (!isRecord(value)
    || !Number.isSafeInteger(value.expectedRevision)
    || Number(value.expectedRevision) < 0
    || !isIdentifierArray(value.boardOrder)
    || !Array.isArray(value.boards)
    || !isIdentifierArray(value.instanceOrder)
    || !Array.isArray(value.instances)) {
    throw new Error("The native host returned an invalid Workspace patch")
  }
  const partial = parseWorkspace({
    revision: Number(value.expectedRevision),
    boards: value.boards,
    instances: value.instances,
  })
  if (partial.boards.length !== value.boards.length
    || partial.instances.length !== value.instances.length) {
    throw new Error("The native host returned invalid Workspace patch entities")
  }
  return {
    expectedRevision: Number(value.expectedRevision),
    boardOrder: [...value.boardOrder],
    boards: partial.boards,
    instanceOrder: [...value.instanceOrder],
    instances: partial.instances,
  }
}

function isIdentifierArray(value: unknown): value is string[] {
  return Array.isArray(value)
    && value.every(id => typeof id === "string" && id.length > 0)
    && new Set(value).size === value.length
}

function parseLocalInstanceIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.some(id => typeof id !== "string" || !id)) {
    throw new Error("The native host returned invalid local Instance bindings")
  }
  return [...new Set(value)]
}

function parseOfflineWorkers(value: unknown): NativeOfflineWorker[] {
  if (!Array.isArray(value) || value.some(worker => (
    !isRecord(worker)
    || typeof worker.id !== "string"
    || !worker.id
    || !isIdentifierArray(worker.instanceIds)
    || worker.instanceIds.length === 0
  ))) {
    throw new Error("The native host returned invalid offline Workers")
  }
  return value.map(worker => ({
    id: String(worker.id),
    instanceIds: [...worker.instanceIds],
  }))
}

function parseRevision(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new Error(`The native host returned an invalid ${label} revision`)
  }
  return Number(value)
}

function parseIllustration(value: unknown): NativeIllustration {
  if (!isRecord(value)
    || typeof value.id !== "string"
    || !/^[a-f\d]{64}$/u.test(value.id)
    || value.mimeType !== "image/svg+xml"
    || typeof value.data !== "string"
    || value.data.length > 1_333_336) {
    throw new Error("The native host returned an invalid Illustration")
  }
  return { id: value.id, mimeType: value.mimeType, data: value.data }
}

function parseLogs(value: unknown): NativeLogEntry[] {
  if (!Array.isArray(value) || value.some(entry => (
    !isRecord(entry)
    || !Number.isSafeInteger(entry.id)
    || typeof entry.timestamp !== "string"
    || !["error", "warn", "info"].includes(String(entry.level))
    || typeof entry.target !== "string"
    || typeof entry.message !== "string"
  ))) {
    throw new Error("The native host returned invalid logs")
  }
  return value as NativeLogEntry[]
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
      capabilities: Array.isArray(value.capabilities)
        && value.capabilities.every(capability => typeof capability === "string")
        ? value.capabilities
        : [],
      widgetServerUrl: parseWidgetServerUrl(value.widgetServerUrl),
      workspace: parseWorkspace(value.workspace),
      localInstanceIds: parseLocalInstanceIds(value.localInstanceIds),
      workerRoutingRevision: parseRevision(
        value.workerRoutingRevision,
        "Worker routing",
      ),
      offlineWorkers: parseOfflineWorkers(value.offlineWorkers),
    }
  }
  if (value.type === "workerRoutingChanged") {
    return {
      type: "workerRoutingChanged",
      revision: parseRevision(value.revision, "Worker routing"),
      localInstanceIds: parseLocalInstanceIds(value.localInstanceIds),
      offlineWorkers: parseOfflineWorkers(value.offlineWorkers),
    }
  }
  if (value.type === "logsResult" && typeof value.requestId === "string") {
    return {
      type: "logsResult",
      requestId: value.requestId,
      logs: parseLogs(value.logs),
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
      patch: parseWorkspacePatch(value.patch),
      localInstanceIds: parseLocalInstanceIds(value.localInstanceIds),
    }
  }
  if (value.type === "workspaceResult"
    && typeof value.requestId === "string"
    && Number.isSafeInteger(value.revision)
    && Number(value.revision) > 0) {
    return {
      type: "workspaceResult",
      requestId: value.requestId,
      revision: Number(value.revision),
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
  if (value.type === "illustrationStored"
    && typeof value.requestId === "string"
    && typeof value.id === "string") {
    return {
      type: "illustrationStored",
      requestId: value.requestId,
      id: value.id,
    }
  }
  if (value.type === "illustrationResult"
    && typeof value.requestId === "string"
    && (value.illustration === null || isRecord(value.illustration))) {
    return {
      type: "illustrationResult",
      requestId: value.requestId,
      illustration: value.illustration === null ? null : parseIllustration(value.illustration),
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
      code: typeof value.code === "string" ? value.code : undefined,
      message: value.message,
    }
  }
  throw new Error("The native host returned an unsupported message")
}

function parseNativeHostValue(value: unknown): ParsedHostMessage | undefined {
  const result = nativeMessageChunks.accept(value)
  return result.complete ? parseHostMessage(result.value) : undefined
}

function isNativeCommandResult(value: unknown): value is NativeCommandResult {
  if (!isRecord(value) || typeof value.ok !== "boolean") return false
  return value.ok ? true : isRecord(value.error) && typeof value.error.message === "string"
}

export function getAppIntegrationStatus(): AppIntegrationStatus {
  return {
    appVersion,
    capabilities: [...capabilities],
    offlineWorkers: offlineWorkers.map(worker => ({ ...worker })),
    connectionError,
    state: enabled ? connectionState : "disabled",
    workerId,
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
      error: serializeAppIntegrationError(error),
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
  const connection = port
  clearReconnectBackoff()
  resetConnectionState()
  connection?.disconnect()
}

function resetConnectionState(
  state: AppIntegrationFailureState = "serviceNotRunning",
  error?: AppIntegrationConnectionError,
): void {
  port = undefined
  appVersion = undefined
  capabilities = []
  workerRoutingRevision = 0
  offlineWorkers = []
  widgetServerUrl = undefined
  connectionState = state
  connectionError = error
  const connectionFailure = new Error(error?.message ?? "NewsNext App disconnected")
  rejectPendingRequests(pendingWidgetSnapshotRequests, connectionFailure)
  rejectPendingRequests(pendingInstanceRequests, connectionFailure)
  rejectPendingRequests(pendingWorkspaceRequests, connectionFailure)
  rejectPendingRequests(pendingIllustrationGetRequests, connectionFailure)
  rejectPendingRequests(pendingIllustrationPutRequests, connectionFailure)
  rejectPendingRequests(pendingLogsRequests, connectionFailure)
  rejectPendingRequests(pendingWorkerTakeoverRequests, connectionFailure)
  rejectPendingConnectionRequests(connectionFailure)
  nativeMessageChunks.clear()
}

function clearReconnectBackoff(): void {
  if (reconnectTimer !== undefined) clearTimeout(reconnectTimer)
  reconnectTimer = undefined
  reconnectAttempt = 0
}

function isRetryableConnectionState(
  state: AppIntegrationState,
): state is "hostNotInstalled" | "serviceNotRunning" {
  return state === "hostNotInstalled" || state === "serviceNotRunning"
}

function scheduleReconnect(): void {
  if (!enabled || port || reconnectTimer !== undefined || !isRetryableConnectionState(connectionState)) {
    return
  }
  const delay = getAppIntegrationReconnectDelay(reconnectAttempt)
  reconnectAttempt += 1
  reconnectTimer = setTimeout(() => {
    reconnectTimer = undefined
    connect()
  }, delay)
}

function failConnection(connection: NativePort, message: string | undefined, code?: string): void {
  if (port !== connection) return
  const state = classifyAppIntegrationFailure(message, code)
  resetConnectionState(state, createConnectionError(state, message, code))
  connection.disconnect()
  if (isRetryableConnectionState(state)) scheduleReconnect()
}

function createConnectionError(
  state: AppIntegrationFailureState,
  message: string | undefined,
  code?: string,
): AppIntegrationConnectionError | undefined {
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
  const runtime = browser.runtime as typeof browser.runtime & {
    lastError?: { message?: string }
  }
  return runtime.lastError?.message
}

async function requireAppConnection(): Promise<NativePort> {
  if (!enabled) {
    throw new Error("NewsNext App integration is disabled")
  }
  if (connectionState === "connected" && port) {
    return port
  }
  if (isRetryableConnectionState(connectionState) && reconnectTimer === undefined) {
    connect()
  }
  if (connectionState !== "connecting" || !port) {
    throw new Error("NewsNext App is not connected")
  }
  return await new Promise((resolve, reject) => {
    const pending: PendingConnectionRequest = {
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

async function applyWorkspace(
  nextWorkspace: NativeWorkspace,
  nextLocalInstanceIds: string[],
): Promise<void> {
  const application = acceptWorkspace(nextWorkspace, nextLocalInstanceIds)
  const current = await readApplicationData()
  if (JSON.stringify(current) !== JSON.stringify(application)) {
    await mirrorApplicationData(application)
  }
  void reconcileIllustrations(application.boards).catch((error) => {
    console.error("Failed to reconcile background illustrations", error)
  })
}

async function reconcileIllustrations(
  boards: NativeWorkspace["boards"],
): Promise<void> {
  const ids = new Set(boards.flatMap(board => board.illustration?.id ?? []))
  await Promise.all(Array.from(ids, async (id) => {
    const bytes = await readPersistedBgIllustrationBytes(id)
    if (bytes !== null) {
      await sendIllustrationToApp({ bytes, id })
    } else {
      await requestIllustration({ id })
    }
  }))
}

function acceptWorkspace(
  nextWorkspace: NativeWorkspace,
  nextLocalInstanceIds: string[],
) {
  workspace = nextWorkspace
  localInstanceIds = new Set(nextLocalInstanceIds)
  return normalizeApplicationData({
    version: APPLICATION_DATA_VERSION,
    boards: nextWorkspace.boards,
    instances: nextWorkspace.instances,
  })
}

function connect(): void {
  if (!enabled || port) {
    return
  }

  connectionState = "connecting"
  connectionError = undefined
  appVersion = undefined
  capabilities = []
  widgetServerUrl = undefined
  let nextPort: NativePort
  try {
    nextPort = browser.runtime.connectNative(NATIVE_HOST_NAME)
  } catch (error) {
    const message = error instanceof Error ? error.message : undefined
    const state = classifyAppIntegrationFailure(message)
    resetConnectionState(state, createConnectionError(state, message))
    if (isRetryableConnectionState(state)) scheduleReconnect()
    return
  }
  port = nextPort
  nextPort.onDisconnect.addListener(() => {
    if (port === nextPort) {
      const errorMessage = runtimeLastErrorMessage()
      const state = connectionState === "daemonOutdated"
        || connectionState === "protocolIncompatible"
        || connectionState === "workerConflict"
        ? connectionState
        : classifyAppIntegrationFailure(errorMessage, connectionError?.code)
      resetConnectionState(
        state,
        errorMessage
          ? createConnectionError(state, errorMessage, connectionError?.code)
          : connectionError,
      )
      if (isRetryableConnectionState(state)) scheduleReconnect()
    }
  })
  nextPort.onMessage.addListener((value: unknown) => {
    if (!enabled || port !== nextPort) {
      return
    }
    try {
      const message = parseNativeHostValue(value)
      if (!message) return
      if (message.type === "ready") {
        if (message.protocolVersion !== PROTOCOL_VERSION) {
          failConnection(
            nextPort,
            `Unsupported native protocol version ${message.protocolVersion}; expected ${PROTOCOL_VERSION}`,
            "PROTOCOL_INCOMPATIBLE",
          )
          return
        }
        if (!isVersionAtLeast(message.daemonVersion, MINIMUM_DAEMON_VERSION)) {
          failConnection(
            nextPort,
            `NewsNext daemon ${message.daemonVersion} is older than required ${MINIMUM_DAEMON_VERSION}`,
            "DAEMON_OUTDATED",
          )
          return
        }
        clearReconnectBackoff()
        appVersion = message.daemonVersion
        capabilities = [...message.capabilities]
        workerRoutingRevision = message.workerRoutingRevision
        offlineWorkers = message.offlineWorkers
        widgetServerUrl = message.widgetServerUrl
        connectionState = "connected"
        resolvePendingConnectionRequests(nextPort)
        void applyWorkspace(message.workspace, message.localInstanceIds).catch((error) => {
          console.error("Failed to apply the NewsNext Workspace", error)
        })
      } else if (message.type === "workerRoutingChanged") {
        if (message.revision > workerRoutingRevision) {
          workerRoutingRevision = message.revision
          localInstanceIds = new Set(message.localInstanceIds)
          offlineWorkers = message.offlineWorkers
        }
      } else if (message.type === "workerTakeoverResult") {
        settleWorkerTakeoverRequest(message.requestId)
      } else if (message.type === "execute") {
        void executeCommand(nextPort, message.request).catch((error) => {
          console.error("Failed to return native App integration result", error)
        })
      } else if (message.type === "widgetSnapshotResult") {
        settleWidgetRequest(message.requestId, message.result)
      } else if (message.type === "workspaceChanged") {
        const nextWorkspace = applyWorkspacePatch(workspace, message.patch)
        void applyWorkspace(nextWorkspace, message.localInstanceIds).catch((error) => {
          console.error("Failed to apply the NewsNext Workspace update", error)
        })
      } else if (message.type === "workspaceResult") {
        settleWorkspaceRequest(
          message.requestId,
          message.revision,
          message.localInstanceIds,
        )
      } else if (message.type === "instanceResult") {
        settleInstanceRequest(message.requestId, message.result)
      } else if (message.type === "illustrationStored") {
        settleIllustrationPutRequest(message.requestId, message.id)
      } else if (message.type === "illustrationResult") {
        void settleIllustrationGetRequest(message.requestId, message.illustration).catch((error) => {
          console.error("Failed to store the synced background illustration", error)
        })
      } else if (message.type === "logsResult") {
        const pending = takePendingRequest(pendingLogsRequests, message.requestId)
        pending?.resolve(message.logs)
      } else {
        if (message.requestId) {
          const error = new Error(message.message)
          if (rejectPendingRequest(pendingWidgetSnapshotRequests, message.requestId, error)
            || rejectPendingRequest(pendingInstanceRequests, message.requestId, error)
            || rejectPendingRequest(pendingWorkspaceRequests, message.requestId, error)
            || rejectPendingRequest(pendingIllustrationGetRequests, message.requestId, error)
            || rejectPendingRequest(pendingIllustrationPutRequests, message.requestId, error)
            || rejectPendingRequest(pendingLogsRequests, message.requestId, error)
            || rejectPendingRequest(pendingWorkerTakeoverRequests, message.requestId, error)) {
            return
          }
        }
        failConnection(nextPort, message.message, message.code)
        console.error("NewsNext native host error", message.message)
      }
    } catch (error) {
      console.error("Failed to process NewsNext native host message", error)
      failConnection(nextPort, error instanceof Error ? error.message : undefined)
    }
  })

  const hello: ExtensionToHost = {
    type: "hello",
    protocolVersion: PROTOCOL_VERSION,
    worker: {
      id: workerId,
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
  const connection = await requireAppConnection()
  const message: ExtensionToHost = {
    type: "widgetSnapshotGet",
    requestId: crypto.randomUUID(),
    ...input,
  }
  return await new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingWidgetSnapshotRequests.delete(message.requestId)
      reject(new Error("Timed out waiting for the NewsNext App"))
    }, NATIVE_REQUEST_TIMEOUT_MS)
    pendingWidgetSnapshotRequests.set(message.requestId, { reject, resolve, timeoutId })
    connection.postMessage(message)
  })
}

export async function requestLogs(): Promise<NativeLogEntry[]> {
  const connection = await requireAppConnection()
  const message: ExtensionToHost = {
    type: "logsGet",
    requestId: crypto.randomUUID(),
  }
  return await new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingLogsRequests.delete(message.requestId)
      reject(new Error("Timed out loading NewsNext App logs"))
    }, NATIVE_REQUEST_TIMEOUT_MS)
    pendingLogsRequests.set(message.requestId, { reject, resolve, timeoutId })
    connection.postMessage(message)
  })
}

export async function requestInstanceLoad(input: { instanceId: string }): Promise<SourceLoadResponse> {
  const result = await requestInstance(input, false)
  if (!result) throw new Error("The NewsNext Worker returned an empty Source result")
  return result
}

export async function requestInstanceCache(input: { instanceId: string }): Promise<SourceLoadResponse | null> {
  return await requestInstance(input, true)
}

export async function storeIllustration(input: {
  bytes: Uint8Array<ArrayBuffer>
  id: string
}): Promise<void> {
  await writePersistedBgIllustration(input.id, input.bytes)
  if (!enabled) return
  await sendIllustrationToApp(input)
}

async function sendIllustrationToApp(input: {
  bytes: Uint8Array<ArrayBuffer>
  id: string
}): Promise<void> {
  const connection = await requireAppConnection()
  const message: ExtensionToHost = {
    type: "illustrationPut",
    requestId: crypto.randomUUID(),
    illustration: {
      id: input.id,
      mimeType: "image/svg+xml",
      data: bytesToBase64(input.bytes),
    },
  }
  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingIllustrationPutRequests.delete(message.requestId)
      reject(new Error("Timed out storing the background illustration"))
    }, NATIVE_REQUEST_TIMEOUT_MS)
    pendingIllustrationPutRequests.set(message.requestId, {
      id: input.id,
      reject,
      resolve,
      timeoutId,
    })
    connection.postMessage(message)
  })
}

export async function requestIllustration(input: {
  id: string
}): Promise<Uint8Array<ArrayBuffer> | null> {
  const persisted = await readPersistedBgIllustrationBytes(input.id)
  if (persisted !== null || !enabled) return persisted
  const activeRequest = activeIllustrationRequests.get(input.id)
  if (activeRequest) return await activeRequest
  const request = requestIllustrationFromApp(input.id)
  activeIllustrationRequests.set(input.id, request)
  try {
    return await request
  } finally {
    if (activeIllustrationRequests.get(input.id) === request) {
      activeIllustrationRequests.delete(input.id)
    }
  }
}

async function requestIllustrationFromApp(
  id: string,
): Promise<Uint8Array<ArrayBuffer> | null> {
  const connection = port
  if (connectionState !== "connected" || !connection) return null
  const message: ExtensionToHost = {
    type: "illustrationGet",
    requestId: crypto.randomUUID(),
    id,
  }
  return await new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingIllustrationGetRequests.delete(message.requestId)
      reject(new Error("Timed out loading the background illustration"))
    }, NATIVE_REQUEST_TIMEOUT_MS)
    pendingIllustrationGetRequests.set(message.requestId, {
      id,
      reject,
      resolve,
      timeoutId,
    })
    connection.postMessage(message)
  })
}

async function requestInstance(
  input: { instanceId: string },
  cacheOnly: boolean,
): Promise<SourceLoadResponse | null> {
  if (!enabled || localInstanceIds.has(input.instanceId)) {
    const application = !enabled ? await readApplicationData() : workspace
    const instance = application.instances.find(candidate => candidate.instanceId === input.instanceId)
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
  const connection = await requireAppConnection()
  const message: ExtensionToHost = {
    type: "instanceGet",
    requestId: crypto.randomUUID(),
    instanceId: input.instanceId,
    cacheOnly,
  }
  return await new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingInstanceRequests.delete(message.requestId)
      reject(new Error("Timed out waiting for the Instance's NewsNext Worker"))
    }, NATIVE_REQUEST_TIMEOUT_MS)
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
  const connection = await requireAppConnection()
  const message: ExtensionToHost = {
    type: "workspaceChanged",
    requestId: crypto.randomUUID(),
    patch: createWorkspacePatch(workspace, candidate),
  }
  return await new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingWorkspaceRequests.delete(message.requestId)
      reject(new Error("Timed out waiting for the NewsNext Workspace commit"))
    }, NATIVE_REQUEST_TIMEOUT_MS)
    pendingWorkspaceRequests.set(message.requestId, {
      candidate,
      reject,
      resolve,
      timeoutId,
    })
    connection.postMessage(message)
  })
}

function settleWidgetRequest(requestId: string, result: NativeCommandResult): void {
  const pending = takePendingRequest(pendingWidgetSnapshotRequests, requestId)
  if (!pending) return
  if (result.ok) {
    pending.resolve(result.data)
  } else {
    pending.reject(new Error(result.error.message))
  }
}

function settleWorkerTakeoverRequest(requestId: string): void {
  takePendingRequest(pendingWorkerTakeoverRequests, requestId)?.resolve()
}

function settleInstanceRequest(requestId: string, result: NativeCommandResult): void {
  const pending = takePendingRequest(pendingInstanceRequests, requestId)
  if (!pending) return
  if (result.ok) {
    if (result.data === null && pending.cacheOnly) {
      pending.resolve(null)
      return
    }
    if (!isSourceLoadResponse(result.data)) {
      pending.reject(new Error("The NewsNext Worker returned an invalid Source result"))
      return
    }
    pending.resolve(result.data)
  } else {
    pending.reject(new Error(result.error.message))
  }
}

function settleWorkspaceRequest(
  requestId: string,
  revision: number,
  nextLocalInstanceIds: string[],
): void {
  const pending = takePendingRequest(pendingWorkspaceRequests, requestId)
  if (!pending) return
  const committed = {
    ...pending.candidate,
    revision,
  }
  acceptWorkspace(committed, nextLocalInstanceIds)
  pending.resolve(committed)
}

function settleIllustrationPutRequest(requestId: string, id: string): void {
  const pending = takePendingRequest(pendingIllustrationPutRequests, requestId)
  if (!pending) return
  if (id !== pending.id) {
    pending.reject(new Error("The NewsNext App stored an unexpected Illustration"))
    return
  }
  pending.resolve()
}

async function settleIllustrationGetRequest(
  requestId: string,
  illustration: NativeIllustration | null,
): Promise<void> {
  const pending = takePendingRequest(pendingIllustrationGetRequests, requestId)
  if (!pending) return
  if (illustration === null) {
    pending.resolve(null)
    return
  }
  try {
    if (illustration.id !== pending.id) {
      throw new Error("The NewsNext App returned an unexpected Illustration")
    }
    const bytes = base64ToBytes(illustration.data)
    await writePersistedBgIllustration(illustration.id, bytes)
    pending.resolve(bytes)
  } catch (error) {
    pending.reject(error instanceof Error ? error : new Error("Invalid Illustration data"))
  }
}

function bytesToBase64(bytes: Uint8Array<ArrayBuffer>): string {
  let binary = ""
  const chunkSize = 32_768
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value)
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function isSourceLoadResponse(value: unknown): value is SourceLoadResponse {
  return isRecord(value)
    && typeof value.fetchProtected === "boolean"
    && typeof value.fetchedAt === "number"
    && typeof value.loadedAt === "number"
    && isRecord(value.params)
    && isRecord(value.result)
}

function rejectPendingRequests<T extends PendingRequest>(
  requests: Map<string, T>,
  error: Error,
): void {
  for (const pending of requests.values()) {
    clearTimeout(pending.timeoutId)
    pending.reject(error)
  }
  requests.clear()
}

function rejectPendingConnectionRequests(error: Error): void {
  for (const pending of pendingConnectionRequests) {
    clearTimeout(pending.timeoutId)
    pending.reject(error)
  }
  pendingConnectionRequests.clear()
}

function resolvePendingConnectionRequests(connection: NativePort): void {
  for (const pending of pendingConnectionRequests) {
    clearTimeout(pending.timeoutId)
    pending.resolve(connection)
  }
  pendingConnectionRequests.clear()
}

function rejectPendingRequest<T extends PendingRequest>(
  requests: Map<string, T>,
  requestId: string,
  error: Error,
): boolean {
  const pending = takePendingRequest(requests, requestId)
  if (!pending) return false
  pending.reject(error)
  return true
}

function takePendingRequest<T extends PendingRequest>(
  requests: Map<string, T>,
  requestId: string,
): T | undefined {
  const pending = requests.get(requestId)
  if (!pending) return undefined
  clearTimeout(pending.timeoutId)
  requests.delete(requestId)
  return pending
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

async function applyAppIntegrationEnabled(nextEnabled: boolean): Promise<void> {
  if (enabled === nextEnabled) {
    return
  }

  enabled = nextEnabled
  if (enabled) {
    browser.alarms.create(APP_INTEGRATION_RECONNECT_ALARM, {
      periodInMinutes: RECONNECT_ALARM_PERIOD_MINUTES,
    })
    connect()
    return
  }

  disconnect()
  await browser.alarms.clear(APP_INTEGRATION_RECONNECT_ALARM)
}

export async function setAppIntegrationEnabled(
  nextEnabled: boolean,
): Promise<AppIntegrationStatus> {
  if (nextEnabled && !await hasAppIntegrationPermission()) {
    throw new Error("NewsNext App integration requires Native Messaging permission")
  }

  const key = PERSISTED_DATA_SLICES.settings.key
  const stored = await browser.storage.local.get(key)
  const settings = normalizePersistedSettings(stored[key])
  await browser.storage.local.set({
    [key]: withAppIntegrationEnabled(
      settings,
      nextEnabled,
    ),
  })
  await applyAppIntegrationEnabled(nextEnabled)
  return getAppIntegrationStatus()
}

async function hasAppIntegrationPermission(): Promise<boolean> {
  return await browser.permissions.contains({
    permissions: [...APP_INTEGRATION_PERMISSIONS],
  }).catch(() => false)
}

export async function takeOverAppIntegrationWorker(
  sourceWorkerId: string,
  instanceIds: string[],
): Promise<AppIntegrationStatus> {
  const offlineWorker = offlineWorkers.find(worker => worker.id === sourceWorkerId)
  if (!offlineWorker
    || instanceIds.length === 0
    || new Set(instanceIds).size !== instanceIds.length
    || instanceIds.some(instanceId => !offlineWorker.instanceIds.includes(instanceId))) {
    throw new Error("The offline Worker's Instances are no longer available")
  }
  const connection = await requireAppConnection()
  const message: ExtensionToHost = {
    type: "workerTakeover",
    requestId: crypto.randomUUID(),
    workerId: sourceWorkerId,
    instanceIds,
  }
  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingWorkerTakeoverRequests.delete(message.requestId)
      reject(new Error("Timed out taking over the offline Worker's Instances"))
    }, NATIVE_REQUEST_TIMEOUT_MS)
    pendingWorkerTakeoverRequests.set(message.requestId, { reject, resolve, timeoutId })
    connection.postMessage(message)
  })
  return getAppIntegrationStatus()
}

export async function regenerateAppIntegrationWorker(): Promise<AppIntegrationStatus> {
  await reconnectAsWorker(crypto.randomUUID())
  return getAppIntegrationStatus()
}

async function reconnectAsWorker(nextWorkerId: string): Promise<void> {
  await browser.storage.local.set({
    [APP_INTEGRATION_WORKER_ID_KEY]: nextWorkerId,
  })
  disconnect()
  workerId = nextWorkerId
  offlineWorkers = []
  workerRoutingRevision = 0
  localInstanceIds = new Set()
  bootstrapBindings = createLocalBindings(workspace.instances, workerId)
  if (enabled) {
    connect()
  }
}

export async function registerAppIntegrationNative(): Promise<void> {
  setApplicationDataCommitter(async (application) => {
    const candidate = createWorkspace(application, workspace.revision)
    if (!enabled) {
      const nextLocalInstanceIds = candidate.instances.map(instance => instance.instanceId)
      bootstrapBindings = createLocalBindings(candidate.instances, workerId)
      return acceptWorkspace(candidate, nextLocalInstanceIds)
    }
    const committed = await requestWorkspaceReplacement(candidate)
    return normalizeApplicationData({
      version: APPLICATION_DATA_VERSION,
      boards: committed.boards,
      instances: committed.instances,
    })
  })
  browser.alarms.onAlarm.addListener((alarm) => {
    if (
      enabled
      && alarm.name === APP_INTEGRATION_RECONNECT_ALARM
      && isRetryableConnectionState(connectionState)
      && reconnectTimer === undefined
    ) {
      connect()
    }
  })
  browser.storage.onChanged.addListener((changes, areaName) => {
    const change = changes[PERSISTED_DATA_SLICES.settings.key]
    if (areaName === "local" && change) {
      const settings = normalizePersistedSettings(change.newValue)
      void applyAppIntegrationEnabled(settings.general.appIntegrationEnabled)
    }
  })
  browser.permissions.onRemoved.addListener((permissions) => {
    if (enabled && permissions.permissions?.includes("nativeMessaging")) {
      void setAppIntegrationEnabled(false)
    }
  })

  const stored = await browser.storage.local.get([
    PERSISTED_DATA_SLICES.settings.key,
    APP_INTEGRATION_WORKER_ID_KEY,
  ])
  const application = await readApplicationData()
  const storedWorkerId = stored[APP_INTEGRATION_WORKER_ID_KEY]
  workerId = typeof storedWorkerId === "string" && storedWorkerId
    ? storedWorkerId
    : workerId
  if (stored[APP_INTEGRATION_WORKER_ID_KEY] !== workerId) {
    await browser.storage.local.set({ [APP_INTEGRATION_WORKER_ID_KEY]: workerId })
  }
  localInstanceIds = new Set()
  workspace = createWorkspace(application, 0)
  bootstrapBindings = createLocalBindings(workspace.instances, workerId)
  const settings = normalizePersistedSettings(stored[PERSISTED_DATA_SLICES.settings.key])
  const hasPermission = await hasAppIntegrationPermission()
  enabled = settings.general.appIntegrationEnabled && hasPermission
  if (settings.general.appIntegrationEnabled && !hasPermission) {
    await setAppIntegrationEnabled(false)
  }
  if (enabled) {
    browser.alarms.create(APP_INTEGRATION_RECONNECT_ALARM, {
      periodInMinutes: RECONNECT_ALARM_PERIOD_MINUTES,
    })
    connect()
  } else {
    await browser.alarms.clear(APP_INTEGRATION_RECONNECT_ALARM)
  }
}
