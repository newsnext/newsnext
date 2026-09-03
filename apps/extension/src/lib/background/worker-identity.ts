import { browser } from "#imports"

const WORKER_ID_KEY = "newsnext-app-integration-worker-id"

let workerId: string = crypto.randomUUID()
let initialization: Promise<string> | undefined

export function getWorkerId(): string {
  return workerId
}

export function initializeWorkerIdentity(): Promise<string> {
  initialization ??= (async () => {
    const stored = await browser.storage.local.get(WORKER_ID_KEY)
    const candidate = stored[WORKER_ID_KEY]
    if (typeof candidate === "string" && candidate) {
      workerId = candidate
    } else {
      await browser.storage.local.set({ [WORKER_ID_KEY]: workerId })
    }
    return workerId
  })()
  return initialization
}

export async function replaceWorkerIdentity(nextWorkerId: string): Promise<void> {
  await initializeWorkerIdentity()
  workerId = nextWorkerId
  await browser.storage.local.set({ [WORKER_ID_KEY]: workerId })
}
