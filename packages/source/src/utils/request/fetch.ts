import type {
  $Fetch,
  FetchOptions,
  FetchRequest,
  FetchResponse,
  MappedResponseType,
  ResponseType,
} from "ofetch"
import { $fetch } from "ofetch"
import {
  SOURCE_HOST_REQUEST_INTERVAL_MS,
  SOURCE_REQUEST_RETRY_COUNT,
  SOURCE_REQUEST_TIMEOUT_MS,
} from "./config"
import { scheduleHostRequest } from "./queue"

const baseSessionFetch = $fetch.create({
  credentials: "include",
  timeout: SOURCE_REQUEST_TIMEOUT_MS,
  retry: SOURCE_REQUEST_RETRY_COUNT,
  retryDelay: SOURCE_HOST_REQUEST_INTERVAL_MS,
})

type NativeFetch = $Fetch["native"]
type NativeFetchRequest = Parameters<NativeFetch>[0]

function getRequestHostname(request: FetchRequest | URL): string | undefined {
  const value = typeof request === "string"
    ? request
    : request instanceof URL
      ? request.href
      : request.url

  try {
    const url = new URL(value)
    return ["http:", "https:"].includes(url.protocol)
      ? url.hostname.toLowerCase()
      : undefined
  } catch {
    return undefined
  }
}

function runScheduledRequest<T>(
  request: FetchRequest | URL,
  execute: () => Promise<T>,
  signal?: AbortSignal | null,
): Promise<T> {
  const hostname = getRequestHostname(request)
  const requestSignal = signal ?? (request instanceof Request ? request.signal : undefined)
  return hostname
    ? scheduleHostRequest(hostname, execute, requestSignal)
    : execute()
}

function withHostQueue(fetchClient: $Fetch): $Fetch {
  const queuedFetch = (async <T = unknown, R extends ResponseType = "json">(
    request: FetchRequest,
    options?: FetchOptions<R>,
  ): Promise<MappedResponseType<R, T>> => runScheduledRequest(
    request,
    () => fetchClient<T, R>(request, options),
    options?.signal,
  )) as $Fetch

  queuedFetch.raw = <T = unknown, R extends ResponseType = "json">(
    request: FetchRequest,
    options?: FetchOptions<R>,
  ): Promise<FetchResponse<MappedResponseType<R, T>>> => runScheduledRequest(
    request,
    () => fetchClient.raw<T, R>(request, options),
    options?.signal,
  )
  queuedFetch.native = ((request: NativeFetchRequest, options?: Parameters<NativeFetch>[1]) => runScheduledRequest(
    request,
    () => fetchClient.native(request, options),
    options?.signal,
  )) as NativeFetch
  queuedFetch.create = (defaults, globalOptions) => withHostQueue(
    fetchClient.create(defaults, globalOptions),
  )

  return queuedFetch
}

export const sessionFetch = withHostQueue(baseSessionFetch)
