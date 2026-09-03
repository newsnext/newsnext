import type { NativeCommandResult, NativeLogEntry, NativeWorkspace } from "@newsnext/extension-connection"
import type { SourceLoadResponse } from "../../source/load-result"
import type { NativePort } from "./types"

interface PendingRequest {
  reject: (error: Error) => void
  timeoutId: ReturnType<typeof setTimeout>
}

export interface PendingInstanceRequest extends PendingRequest {
  cacheOnly: boolean
  resolve: (value: SourceLoadResponse | null) => void
}

export interface PendingWorkspaceRequest extends PendingRequest {
  candidate: NativeWorkspace
  resolve: (value: NativeWorkspace) => void
}

interface PendingWidgetSnapshotRequest extends PendingRequest {
  resolve: (value: unknown) => void
}

interface PendingLogsRequest extends PendingRequest {
  resolve: (logs: NativeLogEntry[]) => void
}

interface PendingConnectionRequest extends PendingRequest {
  resolve: (connection: NativePort) => void
}

interface PendingWorkerTakeoverRequest extends PendingRequest {
  resolve: () => void
}

export const pendingWidgetSnapshotRequests = new Map<string, PendingWidgetSnapshotRequest>()
export const pendingInstanceRequests = new Map<string, PendingInstanceRequest>()
export const pendingWorkspaceRequests = new Map<string, PendingWorkspaceRequest>()
export const pendingLogsRequests = new Map<string, PendingLogsRequest>()
export const pendingConnectionRequests = new Set<PendingConnectionRequest>()
export const pendingWorkerTakeoverRequests = new Map<string, PendingWorkerTakeoverRequest>()

export function rejectAllPendingRequests(error: Error): void {
  rejectPendingRequests(pendingWidgetSnapshotRequests, error)
  rejectPendingRequests(pendingInstanceRequests, error)
  rejectPendingRequests(pendingWorkspaceRequests, error)
  rejectPendingRequests(pendingLogsRequests, error)
  rejectPendingRequests(pendingWorkerTakeoverRequests, error)
  rejectPendingConnectionRequests(error)
}

export function settleWidgetRequest(requestId: string, result: NativeCommandResult): void {
  const pending = takePendingRequest(pendingWidgetSnapshotRequests, requestId)
  if (!pending) return
  if (result.ok) {
    pending.resolve(result.data)
  } else {
    pending.reject(new Error(result.error.message))
  }
}

export function settleWorkerTakeoverRequest(requestId: string): void {
  takePendingRequest(pendingWorkerTakeoverRequests, requestId)?.resolve()
}

export function settleInstanceRequest(requestId: string, result: NativeCommandResult): void {
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

export function isSourceLoadResponse(value: unknown): value is SourceLoadResponse {
  return isRecord(value)
    && typeof value.fetchProtected === "boolean"
    && typeof value.fetchedAt === "number"
    && typeof value.loadedAt === "number"
    && isRecord(value.params)
    && isRecord(value.result)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export function rejectPendingRequest<T extends PendingRequest>(
  requests: Map<string, T>,
  requestId: string,
  error: Error,
): boolean {
  const pending = takePendingRequest(requests, requestId)
  if (!pending) return false
  pending.reject(error)
  return true
}

export function takePendingRequest<T extends PendingRequest>(
  requests: Map<string, T>,
  requestId: string,
): T | undefined {
  const pending = requests.get(requestId)
  if (!pending) return undefined
  clearTimeout(pending.timeoutId)
  requests.delete(requestId)
  return pending
}

export function resolvePendingConnectionRequests(connection: NativePort): void {
  for (const pending of pendingConnectionRequests) {
    clearTimeout(pending.timeoutId)
    pending.resolve(connection)
  }
  pendingConnectionRequests.clear()
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
