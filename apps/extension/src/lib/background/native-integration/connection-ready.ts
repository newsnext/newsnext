import type { NativePort } from "./types"
import { NATIVE_REQUEST_TIMEOUT_MS } from "./state"

interface Waiter {
  resolve: (port: NativePort) => void
  reject: (error: Error) => void
  timeoutId: ReturnType<typeof setTimeout>
}

const waiters = new Set<Waiter>()

export function waitForNativeConnection(): Promise<NativePort> {
  return new Promise((resolve, reject) => {
    const waiter: Waiter = {
      resolve,
      reject,
      timeoutId: setTimeout(() => {
        waiters.delete(waiter)
        reject(new Error("Timed out connecting to the NewsNext App"))
      }, NATIVE_REQUEST_TIMEOUT_MS),
    }
    waiters.add(waiter)
  })
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
