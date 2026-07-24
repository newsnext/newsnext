import type { SourceCacheMaxAge } from "@newsnext/source/typings"
import type { NewsItem } from "@/typings/source"
import { stableStringify } from "@newsnext/shared/utils"
import { normalizeSourceParams, resolveSource } from "@newsnext/source/service"
import { createBackgroundClient } from "./background-client"
import { readCachedSource, writeCachedSource } from "./source-cache"

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
  version: number,
  params: Record<string, unknown>,
): string {
  return `${sourceId}:v${version}:${stableStringify(params)}`
}

export function parseCacheMaxAge(maxAge: SourceCacheMaxAge): number {
  const value = Number.parseFloat(maxAge.slice(0, -1))
  const unit = maxAge.at(-1)
  const unitMilliseconds = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }[unit ?? ""]

  if (!Number.isFinite(value) || value < 0 || unitMilliseconds === undefined) {
    throw new Error(`Invalid source cache maxAge: ${maxAge}`)
  }

  return value * unitMilliseconds
}

export async function loadSource(
  sourceId: string,
  queryParams: Record<string, unknown> = {},
  options: LoadSourceOptions = {},
): Promise<SourceLoadResult> {
  const source = resolveSource(sourceId)
  const params = normalizeSourceParams(source, queryParams)
  const key = buildSourceCacheKey(sourceId, source.cache.version, params)
  const cachedResult = options.forceFresh
    ? undefined
    : await readCachedSource(key, parseCacheMaxAge(source.cache.maxAge))

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
