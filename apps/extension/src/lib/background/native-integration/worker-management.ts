import type { ExtensionToHost } from "@newsnext/extension-connection"
import type { NativeIntegrationStatus, RequireNativeConnection } from "./types"
import { readApplicationData, replaceApplicationData } from "../application-service"
import { replaceWorkerIdentity } from "../worker-identity"
import { pendingWorkerTakeoverRequests } from "./pending-requests"
import { NATIVE_REQUEST_TIMEOUT_MS, runtime } from "./state"

interface WorkerConnectionControls {
  disconnect: () => void
  getStatus: () => NativeIntegrationStatus
  reconnect: () => void
  requireConnection: RequireNativeConnection
}

export async function takeOverWorker(
  sourceWorkerId: string,
  instanceIds: string[],
  controls: WorkerConnectionControls,
): Promise<NativeIntegrationStatus> {
  const offlineWorker = runtime.offlineWorkers.find(worker => worker.id === sourceWorkerId)
  if (!offlineWorker
    || instanceIds.length === 0
    || new Set(instanceIds).size !== instanceIds.length
    || instanceIds.some(instanceId => !offlineWorker.instanceIds.includes(instanceId))) {
    throw new Error("The offline Worker's Instances are no longer available")
  }
  const connection = await controls.requireConnection()
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
  return controls.getStatus()
}

export async function regenerateWorker(
  controls: WorkerConnectionControls,
): Promise<NativeIntegrationStatus> {
  const previousWorkerId = runtime.workerId
  const nextWorkerId = crypto.randomUUID()
  const application = await readApplicationData()
  await replaceWorkerIdentity(nextWorkerId)
  try {
    await replaceApplicationData({
      ...application,
      instances: application.instances.map(instance => instance.workerId === previousWorkerId
        ? { ...instance, workerId: nextWorkerId }
        : instance),
    })
  } catch (error) {
    await replaceWorkerIdentity(previousWorkerId)
    throw error
  }
  controls.disconnect()
  runtime.workerId = nextWorkerId
  runtime.offlineWorkers = []
  runtime.workerRoutingRevision = 0
  runtime.localInstanceIds = new Set()
  if (runtime.enabled) controls.reconnect()
  return controls.getStatus()
}
