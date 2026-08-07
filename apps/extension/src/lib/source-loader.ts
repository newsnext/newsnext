import type { LoadBackgroundSourceOutput } from "./background/source-service"
import { parseSourceCacheMaxAge } from "@newsnext/source/core"
import {
  normalizeSourceParams,
  parseSourceId,
} from "@newsnext/source/runtime"
import { createBackgroundClient } from "./background-client"
import { readSourceCache, writeCachedSource } from "./source-cache"
import { buildSourceCacheKey } from "./source-cache-values"
import { recordSourceObservation, seedSourceHistoryFromCache } from "./source-history"
import { isFetchLatestRateLimited } from "./source-query-policy"
import { loadSourceDescriptor } from "./sources"

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
  providerId: string
  sourceVersion: number
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
    providerId: parseSourceId(sourceId).provider,
    sourceVersion: source.cache.version,
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
    await seedSourceHistoryFromCache({
      params: request.params,
      providerId: request.providerId,
      result: cached.result,
      sourceId,
      sourceVersion: request.sourceVersion,
    })
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
    providerId: request.providerId,
    signal: options.signal,
    sourceVersion: request.sourceVersion,
  })
}

interface FreshSourceLoad {
  sourceId: string
  queryParams: Record<string, unknown>
  cacheKey: string
  providerId: string
  signal?: AbortSignal
  sourceVersion: number
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
    await Promise.all([
      writeCachedSource(request.cacheKey, result),
      recordSourceObservation({
        params: request.queryParams,
        providerId: request.providerId,
        result,
        sourceId: request.sourceId,
        sourceVersion: request.sourceVersion,
      }),
    ])

    return result
  } finally {
    request.signal?.removeEventListener("abort", cancelRequest)
  }
}
