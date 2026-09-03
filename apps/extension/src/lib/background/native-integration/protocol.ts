import type {
  HostToExtension,
  NativeCommandResult,
  NativeLogEntry,
  NativeOfflineWorker,
  NativeWorkspace,
} from "@newsnext/extension-connection"
import { parseExtensionConnectionCommandRequest } from "@newsnext/extension-connection"
import { APPLICATION_DATA_VERSION } from "../../application"
import { normalizeApplicationData } from "../../settings/persisted-data"
import { NativeMessageChunkAssembler } from "../native-message-chunks"
import { parseWorkspacePatch } from "../workspace-patch"
import { NATIVE_REQUEST_TIMEOUT_MS } from "./state"

type ReadyHostMessage = Extract<HostToExtension, { type: "ready" }> & { capabilities: string[] }

export type ParsedHostMessage
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
      widgetServerUrl: parseWidgetServerUrl(value.widgetServerUrl),
      workspace: parseWorkspace(value.workspace),
      localInstanceIds: parseLocalInstanceIds(value.localInstanceIds),
      workerRoutingRevision: parseRevision(value.workerRoutingRevision, "Worker routing"),
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
    instances: value.instances,
  })
  return {
    revision: Number(value.revision),
    updatedAt: Number(value.updatedAt),
    boards: application.boards,
    instances: application.instances,
    settings: value.settings,
  }
}

function parseLocalInstanceIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.some(id => typeof id !== "string" || !id)) {
    throw new Error("The native host returned invalid local Instance IDs")
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

function isIdentifierArray(value: unknown): value is string[] {
  return Array.isArray(value)
    && value.every(id => typeof id === "string" && id.length > 0)
    && new Set(value).size === value.length
}

function parseRevision(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new Error(`The native host returned an invalid ${label} revision`)
  }
  return Number(value)
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

function isNativeCommandResult(value: unknown): value is NativeCommandResult {
  if (!isRecord(value) || typeof value.ok !== "boolean") return false
  return value.ok ? true : isRecord(value.error) && typeof value.error.message === "string"
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}
