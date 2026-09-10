import type { ActionOptions, CallOptions } from "./types.js"
import { NewsNextClient as BaseClient } from "./client.js"
import { streamMessages } from "./message-transport.js"

import { NewsNextError } from "./protocol.js"

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
  yield* streamMessages(request, options, (payload, receive, fail) => {
    const { port1, port2 } = new MessageChannel()
    port1.onmessage = ({ data }: MessageEvent<unknown>) => receive(data)
    port1.onmessageerror = () => fail(new NewsNextError("SDK_PROTOCOL_ERROR", "Invalid Widget SDK message"))
    window.parent.postMessage({ type: "newsnext.widget.sdk", version: 1, request: payload }, "*", [port2])
    return { send: message => port1.postMessage(message), close: () => {
      port1.close()
      port2.close()
    } }
  })
}
