import type { NativeIntegrationStatus, RequireNativeConnection } from "./types"
import type { ExtensionToHost } from "@/lib/native-protocol/ExtensionToHost"
import { createId } from "@/lib/id"
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
  cardIds: string[],
  controls: WorkerConnectionControls,
): Promise<NativeIntegrationStatus> {
  const offlineWorker = runtime.offlineWorkers.find(worker => worker.id === sourceWorkerId)
  if (!offlineWorker
    || cardIds.length === 0
    || new Set(cardIds).size !== cardIds.length
    || cardIds.some(cardId => !offlineWorker.cardIds.includes(cardId))) {
    throw new Error("The offline Worker's LiveCards are no longer available")
  }
  const connection = await controls.requireConnection()
  const message: ExtensionToHost = {
    type: "workerTakeover",
    requestId: createId(),
    workerId: sourceWorkerId,
    cardIds,
  }
  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingWorkerTakeoverRequests.delete(message.requestId)
      reject(new Error("Timed out taking over the offline Worker's LiveCards"))
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
  const nextWorkerId = createId()
  const application = await readApplicationData()
  await replaceWorkerIdentity(nextWorkerId)
  try {
    await replaceApplicationData({
      ...application,
      liveCards: application.liveCards.map(card => card.workerId === previousWorkerId
        ? { ...card, workerId: nextWorkerId }
        : card),
    })
  } catch (error) {
    await replaceWorkerIdentity(previousWorkerId)
    throw error
  }
  controls.disconnect()
  runtime.workerId = nextWorkerId
  runtime.offlineWorkers = []
  runtime.workerRoutingRevision = 0
  runtime.localCardIds = new Set()
  if (runtime.enabled) controls.reconnect()
  return controls.getStatus()
}
