import type { ExtensionToHost, NativeCollectionStatus, NativeLogEntry } from "@newsnext/extension-connection"
import type { RequireNativeConnection } from "./types"
import { pendingCollectionRequests, pendingLogsRequests, pendingWidgetSnapshotRequests } from "./pending-requests"
import { NATIVE_REQUEST_TIMEOUT_MS } from "./state"

export async function requestWidgetSnapshot(
  input: { boardId: string, widgetId: string },
  requireConnection: RequireNativeConnection,
): Promise<unknown> {
  const connection = await requireConnection()
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

export async function requestLogs(
  requireConnection: RequireNativeConnection,
): Promise<NativeLogEntry[]> {
  const connection = await requireConnection()
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

export async function requestCollectionStatus(
  requireConnection: RequireNativeConnection,
): Promise<NativeCollectionStatus> {
  const connection = await requireConnection()
  const message: ExtensionToHost = { type: "collectionStatusGet", requestId: crypto.randomUUID() }
  return await new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingCollectionRequests.delete(message.requestId)
      reject(new Error("Timed out loading stream collection status"))
    }, NATIVE_REQUEST_TIMEOUT_MS)
    pendingCollectionRequests.set(message.requestId, { reject, resolve, timeoutId })
    connection.postMessage(message)
  })
}
