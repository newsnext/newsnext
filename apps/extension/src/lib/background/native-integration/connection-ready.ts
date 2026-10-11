import type { NativePort } from "./types"
import { NATIVE_REQUEST_TIMEOUT_MS } from "./state"

interface Waiter {
  resolve: (port: NativePort) => void
  reject: (error: Error) => void
  timeoutId: ReturnType<typeof setTimeout> | undefined
}

const waiters = new Set<Waiter>()

export function waitForNativeConnection(initializing = false): Promise<NativePort> {
  return new Promise((resolve, reject) => {
    const waiter: Waiter = {
      resolve,
      reject,
      timeoutId: initializing
        ? undefined
        : setTimeout(() => {
            waiters.delete(waiter)
            reject(new Error("Timed out connecting to NewsNext CLI"))
          }, NATIVE_REQUEST_TIMEOUT_MS),
    }
    waiters.add(waiter)
  })
}

// Initialization is an explicit daemon-owned task, not a failed connection.
export function holdNativeConnection(): void {
  for (const waiter of waiters) {
    clearTimeout(waiter.timeoutId)
    waiter.timeoutId = undefined
  }
}

export function resolveNativeConnection(port: NativePort): void {
  for (const waiter of waiters) {
    clearTimeout(waiter.timeoutId)
    waiter.resolve(port)
  }
  waiters.clear()
}

export function rejectNativeConnection(error: Error): void {
  for (const waiter of waiters) {
    clearTimeout(waiter.timeoutId)
    waiter.reject(error)
  }
  waiters.clear()
}
