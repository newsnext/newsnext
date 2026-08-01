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

const inFlightSourceLoads = new Map<string, Promise<SourceLoadResult>>()

export type SourceLoadResult = LoadBackgroundSourceOutput

export interface LoadSourceOptions {
  fetchLatest?: boolean
  onCachedResult?: (result: SourceLoadResult) => void
}

export async function loadSource(
  sourceId: string,
  queryParams: Record<string, unknown> = {},
  options: LoadSourceOptions = {},
): Promise<SourceLoadResult> {
  const source = await loadSourceDescriptor(sourceId)
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

  const inFlightLoad = inFlightSourceLoads.get(cacheKey)
  if (inFlightLoad) {
    return inFlightLoad
  }

  const sourceLoad = loadFreshSource({
    sourceId,
    queryParams,
    cacheKey,
  })
  inFlightSourceLoads.set(cacheKey, sourceLoad)

  try {
    return await sourceLoad
  } finally {
    inFlightSourceLoads.delete(cacheKey)
  }
}

interface FreshSourceLoad {
  sourceId: string
  queryParams: Record<string, unknown>
  cacheKey: string
}

async function loadFreshSource(request: FreshSourceLoad): Promise<SourceLoadResult> {
  const result = await createBackgroundClient().source.load({
    sourceId: request.sourceId,
    params: request.queryParams,
  })

  await writeCachedSource(request.cacheKey, result)

  return result
}
