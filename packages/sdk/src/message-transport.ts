import type { CallOptions } from "./types.js"
import { NewsNextError, parseFrameValue, prepareRequest } from "./protocol.js"

interface MessageConnection {
  send: (message: { type: "next" | "cancel" }) => void
  close: () => void
}
type ConnectMessages = (payload: object, receive: (value: unknown) => void, fail: (error: Error) => void) => MessageConnection

/** Shared pull-based framing for iframe and extension runtime ports. */
export async function* streamMessages(request: object, options: CallOptions, connect: ConnectMessages): AsyncGenerator<unknown> {
  const { signal } = options
  signal?.throwIfAborted()
  const { payload } = prepareRequest(request, options.timeoutMs)
  let connection: MessageConnection | undefined
  let pending: { resolve: (value: unknown) => void, reject: (error: Error) => void } | undefined
  let closed = false
  const close = (): void => {
    if (!connection || closed) return
    closed = true
    try {
      connection.send({ type: "cancel" })
    } catch { /* The host may already be disconnected. */ }
    connection.close()
  }
  let failure: Error | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  const fail = (error: Error): void => {
    failure = error
    clearTimeout(timer)
    pending?.reject(error)
    pending = undefined
    close()
  }
  const receive = (value: unknown): void => {
    clearTimeout(timer)
    if (!pending) return fail(new NewsNextError("SDK_PROTOCOL_ERROR", "Received an unsolicited SDK frame"))
    pending.resolve(value)
    pending = undefined
  }
  const abort = (): void => fail(new NewsNextError("ABORTED", "NewsNext request was aborted"))
  signal?.addEventListener("abort", abort, { once: true })
  window.addEventListener("pagehide", abort, { once: true })
  try {
    const activeConnection = connect(payload, receive, fail)
    connection = activeConnection
    while (true) {
      signal?.throwIfAborted()
      if (failure) throw failure
      const value = await new Promise<unknown>((resolve, reject) => {
        pending = { resolve, reject }
        timer = setTimeout(() => fail(new NewsNextError("TIMEOUT", "Timed out waiting for the NewsNext host")), payload.timeoutMs + 2000)
        activeConnection.send({ type: "next" })
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
    close()
  }
}
