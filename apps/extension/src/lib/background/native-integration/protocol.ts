import type { OfflineWorker as NativeOfflineWorker } from "@newsnext/sdk/models"
import type { HostToExtension } from "@/lib/native-protocol/HostToExtension"
import type { NativeNotification } from "@/lib/native-protocol/NativeNotification"
import type { Workspace as NativeWorkspace } from "@/lib/native-protocol/Workspace"
import { APPLICATION_DATA_VERSION } from "../../application"
import { normalizeApplicationData } from "../../settings/persisted-data"
import { NativeMessageChunkAssembler } from "../native-message-chunks"
import { parseWorkspacePatch } from "../workspace-patch"
import { parseCollectionStatus } from "./collection-status"
import { parseLocalCardIds, parseRevision } from "./message-values"
import { NATIVE_REQUEST_TIMEOUT_MS } from "./state"

type ReadyHostMessage = Extract<HostToExtension, { type: "ready" }> & { capabilities: string[] }

type ParsedHostMessage
  = | Exclude<HostToExtension, { type: "chunk" | "ready" }>
    | ReadyHostMessage

const nativeMessageChunks = new NativeMessageChunkAssembler(NATIVE_REQUEST_TIMEOUT_MS)

export function parseNativeHostValue(value: unknown): ParsedHostMessage | undefined {
  const result = nativeMessageChunks.accept(value)
  return result.complete ? parseHostMessage(result.value) : undefined
}

export function clearNativeMessageChunks(): void {
  nativeMessageChunks.clear()
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
      widgetServerUrl: parseWidgetServerOrigin(value.widgetServerUrl),
      workspace: parseWorkspace(value.workspace),
      localCardIds: parseLocalCardIds(value.localCardIds),
      workerRoutingRevision: parseRevision(value.workerRoutingRevision, "Worker routing"),
      offlineWorkers: parseOfflineWorkers(value.offlineWorkers),
    }
  }
  if (value.type === "rpc" && "message" in value) return { type: "rpc", message: value.message }
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

function parseWorkspace(value: unknown): NativeWorkspace {
  if (!isRecord(value)
    || !Number.isSafeInteger(value.revision)
    || Number(value.revision) < 0
    || !Number.isSafeInteger(value.updatedAt)
    || Number(value.updatedAt) < 0
    || typeof value.settings !== "string") {
    throw new Error("The native host returned an invalid Workspace")
  }
  const application = normalizeApplicationData({
    version: APPLICATION_DATA_VERSION,
    boards: value.boards,
    liveCards: value.liveCards,
  })
  return {
    revision: Number(value.revision),
    updatedAt: Number(value.updatedAt),
    boards: application.boards,
    liveCards: application.liveCards,
    settings: value.settings,
  }
}

function parseOfflineWorkers(value: unknown): NativeOfflineWorker[] {
  if (!Array.isArray(value) || value.some(worker => (
    !isRecord(worker)
    || typeof worker.id !== "string"
    || !worker.id
    || !isIdentifierArray(worker.cardIds)
    || worker.cardIds.length === 0
  ))) {
    throw new Error("The native host returned invalid offline Workers")
  }
  return value.map(worker => ({
    id: String(worker.id),
    cardIds: [...worker.cardIds],
  }))
}

function isIdentifierArray(value: unknown): value is string[] {
  return Array.isArray(value)
    && value.every(id => typeof id === "string" && id.length > 0)
    && new Set(value).size === value.length
}

function parseWidgetServerOrigin(value: unknown): string {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export function parseNativeNotification(method: string, params: unknown): NativeNotification {
  if (!isRecord(params)) throw new Error("The native host returned invalid notification parameters")
  switch (method) {
    case "workerRoutingChanged":
      return { method, params: {
        revision: parseRevision(params.revision, "Worker routing"),
        localCardIds: parseLocalCardIds(params.localCardIds),
        offlineWorkers: parseOfflineWorkers(params.offlineWorkers),
      } }
    case "workspaceChanged":
      return { method, params: { patch: parseWorkspacePatch(params.patch), localCardIds: parseLocalCardIds(params.localCardIds) } }
    case "collectionStatusChanged":
      return { method, params: { status: parseCollectionStatus(params.status) } }
    case "widgetCatalogChanged":
      return { method, params: {} }
    default:
      throw new Error(`Unsupported native notification '${method}'`)
  }
}
