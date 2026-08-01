import type { LoadBackgroundSourceOutput } from "./background/source-service"
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

export async function loadSource(
  sourceId: string,
  queryParams: Record<string, unknown> = {},
  options: LoadSourceOptions = {},
): Promise<SourceLoadResult> {
  options.signal?.throwIfAborted()
  const source = await loadSourceDescriptor(sourceId)
  options.signal?.throwIfAborted()
  const params = normalizeSourceParams(source, queryParams)
  const cacheKey = buildSourceCacheKey(sourceId, source.cache.version, params)
  const cached = await readSourceCache(
    cacheKey,
    parseSourceCacheMaxAge(source.cache.maxAge),
  )

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
