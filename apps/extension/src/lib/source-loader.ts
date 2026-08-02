import type { LoadBackgroundSourceOutput } from "./background/source-service"
import type { SourceCacheReadResult } from "./source-cache"
import { parseSourceCacheMaxAge } from "@newsnext/source/core"
import {
  normalizeSourceParams,
} from "@newsnext/source/runtime"
import { createBackgroundClient } from "./background-client"
import { readSourceCache, writeCachedSource } from "./source-cache"
import { buildSourceCacheKey } from "./source-cache-values"
import { shouldReuseCachedSource } from "./source-query-policy"
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
  }
}

export async function readPersistedSourceCache(
  sourceId: string,
  queryParams: Record<string, unknown> = {},
): Promise<SourceCacheReadResult | undefined> {
  const { cacheKey } = await resolveSourceCacheRequest(sourceId, queryParams)

  return readSourceCache(cacheKey, Number.POSITIVE_INFINITY)
}

export async function loadSource(
  sourceId: string,
  queryParams: Record<string, unknown> = {},
  options: LoadSourceOptions = {},
): Promise<SourceLoadResult> {
  options.signal?.throwIfAborted()
  const { cacheKey, maxAgeMs } = await resolveSourceCacheRequest(sourceId, queryParams)
  options.signal?.throwIfAborted()
  const cached = await readSourceCache(cacheKey, maxAgeMs)

  if (cached?.result.items.length) {
    if (shouldReuseCachedSource({
      cachedAt: cached.cachedAt,
      fetchLatest: options.fetchLatest ?? false,
      isFresh: cached.isFresh,
      now: Date.now(),
    })) {
      return cached.result
    }

    options.onCachedResult?.(cached.result)
  }

  return loadFreshSource({
    sourceId,
    queryParams,
    cacheKey,
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
