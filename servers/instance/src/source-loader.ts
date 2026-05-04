import type { CacheAdapter, CacheResult } from "@newsnext/cache"
import { getCachedSource } from "@newsnext/cache"
import { stableStringify } from "@newsnext/shared/utils"
import {
  normalizeSourceParams,
  resolveSource,
} from "@newsnext/sources/service"

export interface LoadSourceOptions {
  sourceId: string
  params?: Record<string, unknown>
  paramsAreNormalized?: boolean
  adapter: CacheAdapter
  latest?: boolean
  waitUntil?: (promise: Promise<unknown>) => void
}

export interface SourceLoadResult<T> extends CacheResult<T> {
  id: string
  key: string
}

export function buildSourceCacheKey(
  sourceId: string,
  params: Record<string, unknown>,
): string {
  return `${sourceId}:${stableStringify(params)}`
}

export async function loadSource<T>({
  sourceId,
  params: queryParams = {},
  paramsAreNormalized = false,
  adapter,
  latest = false,
  waitUntil,
}: LoadSourceOptions): Promise<SourceLoadResult<T>> {
  const source = resolveSource(sourceId)
  const params = paramsAreNormalized
    ? queryParams
    : normalizeSourceParams(source, queryParams)
  const key = buildSourceCacheKey(sourceId, params)
  const result = await getCachedSource<T>({
    key,
    fetcher: () => source.loader(params) as Promise<T>,
    forceRefresh: latest,
    waitUntil,
  }, adapter)

  return {
    id: sourceId,
    key,
    ...result,
  }
}
