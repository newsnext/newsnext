import type {
  ExtensionConnectionCommandRequest,
  ExtensionToHost,
  HostToExtension,
  NativeCommandResult,
  NativeIllustration,
  NativeWorkspace,
  NativeWorkspacePatch,
} from "@newsnext/extension-connection"
import type { SourceLoadResponse } from "../source/load-result"
import type { AppIntegrationActions } from "./action-context"
import {
  parseExtensionConnectionCommandRequest,
} from "@newsnext/extension-connection"
import { browser } from "#imports"
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
const PROTOCOL_VERSION = 16
const APP_INTEGRATION_WORKER_ID_KEY = "newsnext-app-integration-worker-id"
const APP_INTEGRATION_RECONNECT_ALARM = "app-integration-native-reconnect"
const RECONNECT_ALARM_PERIOD_MINUTES = 0.5
const NATIVE_REQUEST_TIMEOUT_MS = 65_000

export type AppIntegrationState
  = | "disabled"
    | "connected"
    | "connecting"
    | "disconnected"

export interface AppIntegrationStatus {
  appVersion?: string
  claimableWorkerIds: string[]
  state: AppIntegrationState
  workerId: string
  widgetServerUrl?: string
}

type NativePort = ReturnType<typeof browser.runtime.connectNative>
type ParsedHostMessage = Exclude<HostToExtension, { type: "chunk" }>

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

interface PendingIllustrationPutRequest extends PendingRequest {
  id: string
  resolve: () => void
}

let port: NativePort | undefined
let appVersion: string | undefined
let widgetServerUrl: string | undefined
let connectionState: AppIntegrationState = "disconnected"
let enabled = false
let workerId: string = crypto.randomUUID()
let claimableWorkerIds: string[] = []
let workspace: NativeWorkspace = { revision: 0, boards: [], instances: [] }
let localInstanceIds = new Set<string>()
let bootstrapBindings: Array<{ instanceId: string, workerId: string }> = []
const pendingWidgetSnapshotRequests = new Map<string, PendingWidgetSnapshotRequest>()
const pendingInstanceRequests = new Map<string, PendingInstanceRequest>()
const pendingWorkspaceRequests = new Map<string, PendingWorkspaceRequest>()
const pendingIllustrationGetRequests = new Map<string, PendingIllustrationGetRequest>()
const pendingIllustrationPutRequests = new Map<string, PendingIllustrationPutRequest>()
const activeIllustrationRequests = new Map<string, Promise<Uint8Array<ArrayBuffer> | null>>()
const nativeMessageChunks = new NativeMessageChunkAssembler(NATIVE_REQUEST_TIMEOUT_MS)

export const appIntegrationActions: AppIntegrationActions = {
  getIllustration: requestIllustration,
  getStatus: async () => getAppIntegrationStatus(),
  getWidgetSnapshot: requestWidgetSnapshot,
  loadInstance: requestInstanceLoad,
  readInstanceCache: requestInstanceCache,
  putIllustration: storeIllustration,
  setEnabled: async ({ enabled: nextEnabled }) => (
    await setAppIntegrationEnabled(nextEnabled)
  ),
  setWorker: async ({ workerId: nextWorkerId }) => (
    await setAppIntegrationWorker(nextWorkerId)
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

function parseClaimableWorkerIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.some(id => typeof id !== "string" || !id)) {
    throw new Error("The native host returned invalid claimable Worker IDs")
  }
  return [...new Set(value)]
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
      claimableWorkerIds: parseClaimableWorkerIds(value.claimableWorkerIds),
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
    claimableWorkerIds: [...claimableWorkerIds],
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
  resetConnectionState()
  connection?.disconnect()
}

function resetConnectionState(): void {
  port = undefined
  appVersion = undefined
  widgetServerUrl = undefined
  connectionState = "disconnected"
  const error = new Error("NewsNext App disconnected")
  rejectPendingRequests(pendingWidgetSnapshotRequests, error)
  rejectPendingRequests(pendingInstanceRequests, error)
  rejectPendingRequests(pendingWorkspaceRequests, error)
  rejectPendingRequests(pendingIllustrationGetRequests, error)
  rejectPendingRequests(pendingIllustrationPutRequests, error)
  nativeMessageChunks.clear()
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
  appVersion = undefined
  widgetServerUrl = undefined
  const nextPort = browser.runtime.connectNative(NATIVE_HOST_NAME)
  port = nextPort
  nextPort.onDisconnect.addListener(() => {
    if (port === nextPort) {
      resetConnectionState()
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
          throw new Error(`Unsupported native protocol version ${message.protocolVersion}`)
        }
        appVersion = message.daemonVersion
        claimableWorkerIds = message.claimableWorkerIds
        widgetServerUrl = message.widgetServerUrl
        connectionState = "connected"
        void applyWorkspace(message.workspace, message.localInstanceIds).catch((error) => {
          console.error("Failed to apply the NewsNext Workspace", error)
        })
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
      } else {
        if (message.requestId) {
          const error = new Error(message.message)
          if (rejectPendingRequest(pendingWidgetSnapshotRequests, message.requestId, error)
            || rejectPendingRequest(pendingInstanceRequests, message.requestId, error)
            || rejectPendingRequest(pendingWorkspaceRequests, message.requestId, error)
            || rejectPendingRequest(pendingIllustrationGetRequests, message.requestId, error)
            || rejectPendingRequest(pendingIllustrationPutRequests, message.requestId, error)) {
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
  const connection = port
  if (connectionState !== "connected" || !connection) {
    throw new Error("NewsNext App is not connected")
  }
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
  const connection = port
  if (connectionState !== "connected" || !connection) {
    throw new Error("NewsNext App is not connected")
  }
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
  const connection = port
  if (connectionState !== "connected" || !connection) {
    throw new Error("NewsNext App is not connected")
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
  const connection = port
  if (!enabled || connectionState !== "connected" || !connection) {
    throw new Error("NewsNext App is not connected")
  }
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

export async function setAppIntegrationWorker(
  nextWorkerId: string,
): Promise<AppIntegrationStatus> {
  if (nextWorkerId === workerId) {
    return getAppIntegrationStatus()
  }
  if (!claimableWorkerIds.includes(nextWorkerId)) {
    throw new Error("The selected NewsNext Worker is no longer available")
  }

  await browser.storage.local.set({
    [APP_INTEGRATION_WORKER_ID_KEY]: nextWorkerId,
  })
  disconnect()
  workerId = nextWorkerId
  claimableWorkerIds = []
  localInstanceIds = new Set()
  bootstrapBindings = createLocalBindings(workspace.instances, workerId)
  if (enabled) {
    connect()
  }
  return getAppIntegrationStatus()
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
      && connectionState === "disconnected"
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
  enabled = settings.general.appIntegrationEnabled
  if (enabled) {
    browser.alarms.create(APP_INTEGRATION_RECONNECT_ALARM, {
      periodInMinutes: RECONNECT_ALARM_PERIOD_MINUTES,
    })
    connect()
  } else {
    await browser.alarms.clear(APP_INTEGRATION_RECONNECT_ALARM)
  }
}
