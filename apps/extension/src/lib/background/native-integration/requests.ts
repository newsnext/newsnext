import type { ExtensionToHost, NativeLogEntry } from "@newsnext/extension-connection"
import type { SourceLoadResponse } from "../../source/load-result"
import type { BackgroundActionContext } from "../background-actions"
import type { RequireNativeConnection } from "./types"
import { executeRegisteredAction } from "../action-registry"
import { readApplicationData } from "../application-service"
import {
  isSourceLoadResponse,
  pendingInstanceRequests,
  pendingLogsRequests,
  pendingWidgetSnapshotRequests,
} from "./pending-requests"
import { NATIVE_REQUEST_TIMEOUT_MS, runtime } from "./state"

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

export async function requestInstanceLoad(
  input: { instanceId: string },
  requireConnection: RequireNativeConnection,
  actionContext: BackgroundActionContext,
): Promise<SourceLoadResponse> {
  const result = await requestInstance(input, false, requireConnection, actionContext)
  if (!result) throw new Error("The NewsNext Worker returned an empty Source result")
  return result
}

export async function requestInstanceCache(
  input: { instanceId: string },
  requireConnection: RequireNativeConnection,
  actionContext: BackgroundActionContext,
): Promise<SourceLoadResponse | null> {
  return await requestInstance(input, true, requireConnection, actionContext)
}

async function requestInstance(
  input: { instanceId: string },
  cacheOnly: boolean,
  requireConnection: RequireNativeConnection,
  actionContext: BackgroundActionContext,
): Promise<SourceLoadResponse | null> {
  if (!runtime.enabled || runtime.localInstanceIds.has(input.instanceId)) {
    const application = !runtime.enabled ? await readApplicationData() : runtime.workspace
    const instance = application.instances.find(candidate => candidate.instanceId === input.instanceId)
    if (!instance) throw new Error(`Instance '${input.instanceId}' not found`)
    if (instance.workerId !== runtime.workerId) {
      throw new Error("The Instance's NewsNext Worker is not connected")
    }
    const result = await executeRegisteredAction(
      cacheOnly ? "loader.readInstanceCache" : "loader.loadInstance",
      { instance },
      "connected",
      actionContext,
      crypto.randomUUID(),
    )
    if (result === null && cacheOnly) return null
    if (!isSourceLoadResponse(result)) {
      throw new Error("The current browser returned an invalid Source result")
    }
    return result
  }
  const connection = await requireConnection()
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
