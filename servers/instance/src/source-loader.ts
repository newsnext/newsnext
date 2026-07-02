import {
  normalizeSourceParams,
  resolveSource,
} from "@newsnext/server-source/service"
import { stableStringify } from "@newsnext/shared/utils"

export interface LoadSourceOptions {
  sourceId: string
  params?: Record<string, unknown>
  paramsAreNormalized?: boolean
}

export interface PreparedInstanceSourceRequest<T> {
  sourceId: string
  params: Record<string, unknown>
  key: string
  source: ReturnType<typeof resolveSource>
  fetcher: () => Promise<T>
}

export interface SourceLoadResult<T> {
  id: string
  key: string
  items: T
  updated: number
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
}: LoadSourceOptions): Promise<SourceLoadResult<T>> {
  const request = prepareInstanceSourceRequest<T>({
    sourceId,
    params: queryParams,
    paramsAreNormalized,
  })
  const items = await request.fetcher()

  return {
    id: sourceId,
    key: request.key,
    items,
    updated: Date.now(),
  }
}

export function prepareInstanceSourceRequest<T>({
  sourceId,
  params: queryParams = {},
  paramsAreNormalized = false,
}: LoadSourceOptions): PreparedInstanceSourceRequest<T> {
  const source = resolveSource(sourceId)
  const params = paramsAreNormalized
    ? queryParams
    : normalizeSourceParams(source, queryParams)
  const key = buildSourceCacheKey(sourceId, params)

  return {
    sourceId,
    params,
    key,
    source,
    fetcher: () => source.loader(params) as Promise<T>,
  }
}
