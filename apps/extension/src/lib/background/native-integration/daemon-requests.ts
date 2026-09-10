import type { RequireNativeConnection } from "./types"
import type { CollectionStatus as NativeCollectionStatus } from "@/lib/native-protocol/CollectionStatus"
import type { ExtensionToHost } from "@/lib/native-protocol/ExtensionToHost"
import type { LogEntry as NativeLogEntry } from "@/lib/native-protocol/LogEntry"
import { createId } from "@/lib/id"
import { pendingCollectionRequests, pendingLogsRequests } from "./pending-requests"
import { NATIVE_REQUEST_TIMEOUT_MS } from "./state"

export async function requestLogs(
  requireConnection: RequireNativeConnection,
): Promise<NativeLogEntry[]> {
  const connection = await requireConnection()
  const message: ExtensionToHost = {
    type: "logsGet",
    requestId: createId(),
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

export async function requestCollectionStatus(
  requireConnection: RequireNativeConnection,
): Promise<NativeCollectionStatus> {
  const connection = await requireConnection()
  const message: ExtensionToHost = { type: "collectionStatusGet", requestId: createId() }
  return await new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingCollectionRequests.delete(message.requestId)
      reject(new Error("Timed out loading stream collection status"))
    }, NATIVE_REQUEST_TIMEOUT_MS)
    pendingCollectionRequests.set(message.requestId, { reject, resolve, timeoutId })
    connection.postMessage(message)
  })
}
