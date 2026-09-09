import type { ClientOptions } from "./types.js"
import { NewsNextClient as BaseClient } from "./client.js"
import { stream } from "./transport.js"

export type * from "./actions.js"
export { NewsNextError } from "./protocol.js"
export type * from "./types.js"

export class NewsNextClient extends BaseClient {
  constructor(options: ClientOptions = {}) {
    super(options, (request, callOptions) => stream(options, request, callOptions))
  }
}

export function createClient(options: ClientOptions = {}): NewsNextClient {
  return new NewsNextClient(options)
}
