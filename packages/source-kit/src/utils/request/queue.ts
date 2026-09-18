import { SOURCE_HOST_REQUEST_INTERVAL_MS } from "@newsnext/shared/constants"
import PQueue from "p-queue"

const hostQueues = new Map<string, PQueue>()

function getHostQueue(hostname: string): PQueue {
  const normalizedHostname = hostname.toLowerCase()
  const existingQueue = hostQueues.get(normalizedHostname)
  if (existingQueue) {
    return existingQueue
  }

  const queue = new PQueue({
    concurrency: 1,
    interval: SOURCE_HOST_REQUEST_INTERVAL_MS,
    intervalCap: 1,
    strict: true,
  })
  hostQueues.set(normalizedHostname, queue)
  return queue
}

export function scheduleHostRequest<T>(
  hostname: string,
  request: () => Promise<T>,
  signal?: AbortSignal | null,
): Promise<T> {
  return getHostQueue(hostname).add(request, {
    signal: signal ?? undefined,
  })
}
