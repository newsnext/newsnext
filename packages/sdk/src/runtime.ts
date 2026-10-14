import type { SdkTransport } from "./client.js"
import type { ClientOptions } from "./types.js"
import { NewsNextClient } from "./client.js"

export type { SdkTransport } from "./client.js"
export { NewsNextError } from "./protocol.js"
export type * from "./types.js"

/** Creates a client using the host's transport without starting a CLI process. */
export function createClientWithTransport(transport: SdkTransport, options: ClientOptions = {}): NewsNextClient {
  return new NewsNextClient(options, transport)
}
