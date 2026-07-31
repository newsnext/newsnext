import type { SourcePresentationMetadata } from "@newsnext/source/types"
import type { NewsItem } from "@/typings/source"
import {
  normalizeSourceParams,
} from "@newsnext/source/runtime"
import { createBackgroundClient } from "./background-client"
import { readSourceCache, writeCachedSource } from "./source-cache"
import { buildSourceCacheKey, parseCacheMaxAge } from "./source-cache-values"
import { loadSourceDescriptor } from "./sources"

export { buildSourceCacheKey, parseCacheMaxAge } from "./source-cache-values"

const EMPTY_SOURCE_ITEMS_ERROR_MESSAGE = "No source items. Refresh to try again."
const inFlightSourceLoads = new Map<string, Promise<SourceLoadResult>>()

export interface SourceLoadResult {
  items: NewsItem[]
  metadata?: SourcePresentationMetadata
  updatedAt: number
}

export interface LoadSourceOptions {
  forceFresh?: boolean
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
    parseCacheMaxAge(source.cache.maxAge),
  )

  if (cached?.result.items.length) {
    if (!options.forceFresh && cached.isFresh) {
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
  const loaded = await createBackgroundClient().source.load({
    sourceId: request.sourceId,
    params: request.queryParams,
  })

  const result = {
    items: loaded.items,
    metadata: loaded.metadata,
    updatedAt: loaded.updatedAt,
  }

  if (!result.items.length) {
    throw new Error(EMPTY_SOURCE_ITEMS_ERROR_MESSAGE)
  }

  await writeCachedSource(request.cacheKey, result)

  return result
}
