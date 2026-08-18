import type { LoadBackgroundSourceOutput } from "../background/source-service"
import { parseSourceCacheMaxAge } from "@newsnext/source-kit/core"
import {
  normalizeSourceParams,
} from "@newsnext/source-kit/runtime"
import { createBackgroundClient } from "../background/client"
import { readSourceCache, writeCachedSource } from "./cache"
import { buildSourceCacheKey } from "./cache-values"
import { isFetchLatestRateLimited } from "./query-policy"
import { loadSourceDescriptor } from "./registry"

export type SourceLoadResult = LoadBackgroundSourceOutput

export interface LoadSourceOptions {
  fetchLatest?: boolean
  onCachedResult?: (result: SourceLoadResult) => void
  signal?: AbortSignal
}

interface SourceCacheRequest {
  cacheKey: string
  maxAgeMs: number
  params: Record<string, unknown>
}

async function resolveSourceCacheRequest(
  sourceId: string,
  queryParams: Record<string, unknown>,
): Promise<SourceCacheRequest> {
  const source = await loadSourceDescriptor(sourceId)
  const params = normalizeSourceParams(source, queryParams)

  return {
    cacheKey: buildSourceCacheKey(sourceId, source.cache.version, params),
    maxAgeMs: parseSourceCacheMaxAge(source.cache.maxAge),
    params,
  }
}

export async function readPersistedSourceCache(
  sourceId: string,
  queryParams: Record<string, unknown> = {},
): Promise<SourceLoadResult | undefined> {
  const { cacheKey } = await resolveSourceCacheRequest(sourceId, queryParams)

  return (await readSourceCache(cacheKey, Number.POSITIVE_INFINITY))?.result
}

export async function loadSource(
  sourceId: string,
  queryParams: Record<string, unknown> = {},
  options: LoadSourceOptions = {},
): Promise<SourceLoadResult> {
  options.signal?.throwIfAborted()
  const request = await resolveSourceCacheRequest(sourceId, queryParams)
  options.signal?.throwIfAborted()
  const cached = await readSourceCache(request.cacheKey, request.maxAgeMs)

  if (cached?.result.items.length) {
    const fetchLatest = options.fetchLatest ?? false
    const now = Date.now()
    const shouldReuse = fetchLatest
      ? isFetchLatestRateLimited(cached.result.updatedAt, now)
      : cached.isFresh
    if (shouldReuse) {
      return fetchLatest
        ? { ...cached.result, updatedAt: now }
        : cached.result
    }

    options.onCachedResult?.(cached.result)
  }

  return loadFreshSource({
    sourceId,
    queryParams: request.params,
    cacheKey: request.cacheKey,
    signal: options.signal,
  })
}

interface FreshSourceLoad {
  sourceId: string
  queryParams: Record<string, unknown>
  cacheKey: string
  signal?: AbortSignal
}

async function loadFreshSource(request: FreshSourceLoad): Promise<SourceLoadResult> {
  const client = createBackgroundClient()
  const requestId = crypto.randomUUID()
  const cancelRequest = () => {
    void client.source.cancel({ requestId }).catch(() => undefined)
  }
  request.signal?.addEventListener("abort", cancelRequest, { once: true })

  try {
    request.signal?.throwIfAborted()
    const result = await client.source.load({
      requestId,
      sourceId: request.sourceId,
      params: request.queryParams,
    })

    request.signal?.throwIfAborted()
    await writeCachedSource(request.cacheKey, result)

    return result
  } finally {
    request.signal?.removeEventListener("abort", cancelRequest)
  }
}
