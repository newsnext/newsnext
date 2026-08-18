import type { Input } from "ky"
import type { SourceFetch } from "../../types"
import ky from "ky"
import {
  SOURCE_REQUEST_RETRY_COUNT,
  SOURCE_REQUEST_TIMEOUT_MS,
} from "./config"
import { scheduleHostRequest } from "./queue"

function getRequestHostname(input: Input): string | undefined {
  try {
    const url = new URL(input instanceof Request ? input.url : input)
    return ["http:", "https:"].includes(url.protocol)
      ? url.hostname.toLowerCase()
      : undefined
  } catch {
    return undefined
  }
}

function queuedFetch(input: Input, init?: RequestInit): Promise<Response> {
  const hostname = getRequestHostname(input)
  const execute = () => globalThis.fetch(input, init)
  const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined)
  return hostname
    ? scheduleHostRequest(hostname, execute, signal)
    : execute()
}

export const sessionFetch: SourceFetch = ky.create({
  credentials: "include",
  fetch: queuedFetch,
  timeout: SOURCE_REQUEST_TIMEOUT_MS,
  retry: {
    afterStatusCodes: [429, 503],
    backoffLimit: SOURCE_REQUEST_TIMEOUT_MS,
    jitter: true,
    limit: SOURCE_REQUEST_RETRY_COUNT,
    maxRetryAfter: SOURCE_REQUEST_TIMEOUT_MS,
    methods: ["get"],
    statusCodes: [429, 500, 502, 503, 504],
  },
})

export function createSourceFetch(
  signal: AbortSignal,
  validateUrl?: (url: string) => void,
): SourceFetch {
  return sessionFetch.extend({
    hooks: {
      init: [(options) => {
        options.signal = signal
      }],
      beforeRequest: [({ request }) => {
        validateUrl?.(request.url)
      }],
    },
  })
}
