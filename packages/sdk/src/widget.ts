import type { ActionOptions, CallOptions } from "./types.js"
import { NewsNextClient as BaseClient } from "./client.js"
import { NewsNextError, parseFrameValue, prepareRequest } from "./protocol.js"

export type * from "./actions.js"
export { NewsNextError } from "./protocol.js"
export type * from "./types.js"

/** Uses the embedding extension's environment and Worker by default. */
export class NewsNextClient extends BaseClient {
  constructor(options: ActionOptions = {}) {
    super(options, stream)
  }
}

export function createClient(options: ActionOptions = {}): NewsNextClient {
  return new NewsNextClient(options)
}

async function* stream(request: object, options: CallOptions): AsyncGenerator<unknown> {
  if (typeof window === "undefined" || window.parent === window) {
    throw new NewsNextError("WIDGET_HOST_MISSING", "The Widget SDK requires a NewsNext host iframe")
  }
  const { signal } = options
  signal?.throwIfAborted()
  const { payload } = prepareRequest(request, options.timeoutMs)
  const { timeoutMs } = payload
  const { port1, port2 } = new MessageChannel()
  let pending: { resolve: (value: unknown) => void, reject: (error: Error) => void } | undefined
  let failure: Error | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  const fail = (error: Error): void => {
    failure = error
    pending?.reject(error)
    pending = undefined
    port1.postMessage({ type: "cancel" })
  }
  const abort = (): void => fail(new NewsNextError("ABORTED", "NewsNext request was aborted"))
  port1.onmessage = ({ data }: MessageEvent<unknown>) => {
    clearTimeout(timer)
    if (pending) {
      pending.resolve(data)
      pending = undefined
    } else {
      fail(new NewsNextError("SDK_PROTOCOL_ERROR", "Received an unsolicited SDK frame"))
    }
  }
  port1.onmessageerror = () => fail(new NewsNextError("SDK_PROTOCOL_ERROR", "Invalid Widget SDK message"))
  signal?.addEventListener("abort", abort, { once: true })
  window.addEventListener("pagehide", abort, { once: true })
  try {
    // Install the receiver before transferring the port; only the parent receives this capability.
    window.parent.postMessage({ type: "newsnext.widget.sdk", version: 1, request: payload }, "*", [port2])
    while (true) {
      signal?.throwIfAborted()
      if (failure) throw failure
      const value = await new Promise<unknown>((resolve, reject) => {
        pending = { resolve, reject }
        timer = setTimeout(() => fail(new NewsNextError("TIMEOUT", "Timed out waiting for the Widget host")), timeoutMs + 2000)
        port1.postMessage({ type: "next" })
      })
      const frame = parseFrameValue(value)
      if (frame.type === "error") throw new NewsNextError(frame.error.code, frame.error.message)
      if (frame.type === "end") return
      yield frame.data
    }
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener("abort", abort)
    window.removeEventListener("pagehide", abort)
    port1.postMessage({ type: "cancel" })
    port1.close()
    port2.close()
  }
}
