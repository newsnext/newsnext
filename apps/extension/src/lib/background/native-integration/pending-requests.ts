import type { SourceLoadResponse } from "../../source/load-result"
import type { NativePort } from "./types"
import type { CollectionStatus as NativeCollectionStatus } from "@/lib/native-protocol/CollectionStatus"
import type { CommandResult as NativeCommandResult } from "@/lib/native-protocol/CommandResult"
import type { LogEntry as NativeLogEntry } from "@/lib/native-protocol/LogEntry"
import type { Workspace as NativeWorkspace } from "@/lib/native-protocol/Workspace"

interface PendingRequest {
  reject: (error: Error) => void
  timeoutId: ReturnType<typeof setTimeout>
}

interface PendingLiveCardRequest extends PendingRequest {
  cacheOnly: boolean
  resolve: (value: SourceLoadResponse | null) => void
}

interface PendingWorkspaceRequest extends PendingRequest {
  candidate: NativeWorkspace
  resolve: (value: NativeWorkspace) => void
}

interface PendingLogsRequest extends PendingRequest {
  resolve: (logs: NativeLogEntry[]) => void
}

interface PendingCollectionRequest extends PendingRequest {
  resolve: (status: NativeCollectionStatus) => void
}

interface PendingConnectionRequest extends PendingRequest {
  resolve: (connection: NativePort) => void
}

interface PendingWorkerTakeoverRequest extends PendingRequest {
  resolve: () => void
}

export const pendingLiveCardRequests = new Map<string, PendingLiveCardRequest>()
export const pendingWorkspaceRequests = new Map<string, PendingWorkspaceRequest>()
export const pendingCollectionRequests = new Map<string, PendingCollectionRequest>()
export const pendingLogsRequests = new Map<string, PendingLogsRequest>()
export const pendingConnectionRequests = new Set<PendingConnectionRequest>()
export const pendingWorkerTakeoverRequests = new Map<string, PendingWorkerTakeoverRequest>()

export function rejectAllPendingRequests(error: Error): void {
  rejectPendingRequests(pendingLiveCardRequests, error)
  rejectPendingRequests(pendingWorkspaceRequests, error)
  rejectPendingRequests(pendingLogsRequests, error)
  rejectPendingRequests(pendingCollectionRequests, error)
  rejectPendingRequests(pendingWorkerTakeoverRequests, error)
  rejectPendingConnectionRequests(error)
}

export function settleWorkerTakeoverRequest(requestId: string): void {
  takePendingRequest(pendingWorkerTakeoverRequests, requestId)?.resolve()
}

export function settleLiveCardRequest(requestId: string, result: NativeCommandResult): void {
  const pending = takePendingRequest(pendingLiveCardRequests, requestId)
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
