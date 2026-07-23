import type { NewsItem } from "@/typings/source"
import { stableStringify } from "@newsnext/shared/utils"
import { normalizeSourceParams, resolveSource } from "@newsnext/source/service"
import { createBackgroundClient } from "./background-client"
import { readCachedSource, writeCachedSource } from "./source-cache"

const SOURCE_REQUEST_MIN_INTERVAL = 1000 * 60
const EMPTY_SOURCE_ITEMS_ERROR_MESSAGE = "No source items. Refresh to try again."
const inFlightSourceLoads = new Map<string, Promise<SourceLoadResult>>()

export interface SourceLoadResult {
  id: string
  key: string
  items: NewsItem[]
  updatedAt: number
}

export interface LoadSourceOptions {
  forceFresh?: boolean
}

export function buildSourceCacheKey(
  sourceId: string,
  cacheVersion: number,
  params: Record<string, unknown>,
): string {
  return `${sourceId}:v${cacheVersion}:${stableStringify(params)}`
}

export async function loadSource(
  sourceId: string,
  queryParams: Record<string, unknown> = {},
  options: LoadSourceOptions = {},
): Promise<SourceLoadResult> {
  const source = resolveSource(sourceId)
  const params = normalizeSourceParams(source, queryParams)
  const key = buildSourceCacheKey(sourceId, source.cacheVersion ?? 1, params)
  const cachedResult = options.forceFresh
    ? undefined
    : await readCachedSource(key, SOURCE_REQUEST_MIN_INTERVAL)

  if (cachedResult?.items.length) {
    return cachedResult
  }

  const inFlightLoad = inFlightSourceLoads.get(key)
  if (inFlightLoad) {
    return inFlightLoad
  }

  const sourceLoad = loadFreshSource({
    sourceId,
    queryParams,
    key,
    loadInCurrentContext: () => source.loader(params),
  })
  inFlightSourceLoads.set(key, sourceLoad)

  try {
    return await sourceLoad
  } finally {
    inFlightSourceLoads.delete(key)
  }
}

interface FreshSourceLoad {
  sourceId: string
  queryParams: Record<string, unknown>
  key: string
  loadInCurrentContext: () => Promise<NewsItem[]>
}

async function loadFreshSource(request: FreshSourceLoad): Promise<SourceLoadResult> {
  const backgroundClient = createBackgroundClient()
  const loaded = backgroundClient
    ? await backgroundClient.source.load({
        sourceId: request.sourceId,
        params: request.queryParams,
      })
    : {
        items: await request.loadInCurrentContext(),
        updatedAt: Date.now(),
      }

  const result = {
    id: request.sourceId,
    key: request.key,
    items: loaded.items,
    updatedAt: loaded.updatedAt,
  }

  if (!result.items.length) {
    throw new Error(EMPTY_SOURCE_ITEMS_ERROR_MESSAGE)
  }

  if (result.items.length) {
    await writeCachedSource(result)
  }

  return result
}
