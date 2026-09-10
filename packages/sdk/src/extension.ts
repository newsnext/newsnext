import type { ActionOptions } from "./types.js"
import { browser } from "@wxt-dev/browser"
import { NewsNextClient } from "./client.js"
import { streamMessages } from "./message-transport.js"
import { NewsNextError } from "./protocol.js"

export type * from "./types.js"

/** For NewsNext's extension app; the background validates the port sender. */
export function createClient(options: ActionOptions = {}): NewsNextClient {
  return new NewsNextClient(options, (request, callOptions) => streamMessages(request, callOptions, (payload, receive, fail) => {
    const port = browser.runtime.connect({ name: "newsnext.widget.sdk" })
    const disconnected = (): void => fail(new NewsNextError("HOST_DISCONNECTED", "The NewsNext SDK connection closed"))
    port.onMessage.addListener(receive)
    port.onDisconnect.addListener(disconnected)
    port.postMessage({ type: "newsnext.widget.sdk", version: 1, request: payload })
    return {
      send: message => port.postMessage(message),
      close: () => {
        port.onMessage.removeListener(receive)
        port.onDisconnect.removeListener(disconnected)
        port.disconnect()
      },
    }
  }))
}
