import type { CacheAdapter, CacheResult } from "@newsnext/cache"
import type { SourceOptions } from "../typings"
import { getCachedSource } from "@newsnext/cache"
import { sources } from "../index"

export type SourceErrorCode =
  | "GROUP_NOT_FOUND"
  | "INVALID_FORMAT"
  | "NO_FETCHER"
  | "SOURCE_NOT_FOUND"

export class SourceServiceError extends Error {
  readonly code: SourceErrorCode

  constructor(code: SourceErrorCode, message: string) {
    super(message)
    this.name = "SourceServiceError"
    this.code = code
  }
}

export interface ParsedSourceId {
  namespace: string
  id: string
}

export interface ExecuteSourceOptions {
  sourceId: string
  params?: Record<string, unknown>
  adapter: CacheAdapter
  latest?: boolean
  waitUntil?: (promise: Promise<unknown>) => void
}

export interface ExecuteSourceResult<T> extends CacheResult<T> {
  id: string
}

export function parseSourceId(sourceId: string): ParsedSourceId {
  const [namespace, id = "default"] = sourceId.split(":")

  if (!namespace || !id) {
    throw new SourceServiceError(
      "INVALID_FORMAT",
      "Invalid source ID format. Expected 'group:id'",
    )
  }

  return { namespace, id }
}

export function resolveSource(sourceId: string): SourceOptions {
  const { namespace, id } = parseSourceId(sourceId)
  const sourceGroup = sources[namespace as keyof typeof sources]

  if (!sourceGroup) {
    throw new SourceServiceError(
      "GROUP_NOT_FOUND",
      `Source group '${namespace}' not found`,
    )
  }

  const source = sourceGroup[id]
  if (!source) {
    throw new SourceServiceError(
      "SOURCE_NOT_FOUND",
      `Source '${id}' not found in group '${namespace}'`,
    )
  }

  if (!source.fetcher) {
    throw new SourceServiceError(
      "NO_FETCHER",
      "Source does not have a fetcher",
    )
  }

  return source
}

export function normalizeSourceParams(
  source: Pick<SourceOptions, "params">,
  queryParams: Record<string, unknown> = {},
): Record<string, unknown> {
  const params: Record<string, unknown> = {}

  if (!source.params) {
    return params
  }

  for (const [key, config] of Object.entries(source.params)) {
    const value = queryParams[key]

    if (value !== undefined) {
      switch (config.type) {
        case "number":
          params[key] = Number(value)
          break
        case "switch":
          params[key] = value === true || value === "true" || value === "1" || value === 1
          break
        default:
          params[key] = value
      }
      continue
    }

    params[key] = config.default
  }

  return params
}

export function buildSourceCacheKey(
  sourceId: string,
  params: Record<string, unknown>,
): string {
  return `${sourceId}:${JSON.stringify(params)}`
}

export async function executeSource<T>({
  sourceId,
  params: queryParams = {},
  adapter,
  latest = false,
  waitUntil,
}: ExecuteSourceOptions): Promise<ExecuteSourceResult<T>> {
  const source = resolveSource(sourceId)
  const params = normalizeSourceParams(source, queryParams)
  const result = await getCachedSource<T>({
    key: buildSourceCacheKey(sourceId, params),
    fetcher: () => source.fetcher(params) as Promise<T>,
    forceRefresh: latest,
    waitUntil,
  }, adapter)

  return {
    id: sourceId,
    ...result,
  }
}
