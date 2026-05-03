import type { CacheAdapter, CacheResult } from "@newsnext/cache"
import type { SourceParamSchemaMap, InferSourceParams, RegisteredSourceDefinition } from "../typings"
import { getCachedSource } from "@newsnext/cache"
import { stableStringify } from "@newsnext/shared/utils"
import { providers } from "../index"
import { SourceParamValueError } from "../typings"
import { parseSourceParams } from "../utils/params"

export type SourceErrorCode
  = | "SOURCE_NOT_FOUND"
    | "INVALID_PARAMS"
    | "INVALID_FORMAT"
    | "LOADER_NOT_FOUND"
    | "PROVIDER_NOT_FOUND"

export class SourceServiceError extends Error {
  readonly code: SourceErrorCode

  constructor(code: SourceErrorCode, message: string) {
    super(message)
    this.name = "SourceServiceError"
    this.code = code
  }
}

export interface ParsedSourceId {
  provider: string
  source: string
}

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

export interface PreparedSourceRequest<TParams extends SourceParamSchemaMap = SourceParamSchemaMap> {
  source: RegisteredSourceDefinition<TParams>
  params: InferSourceParams<TParams>
}

export function parseSourceId(sourceId: string): ParsedSourceId {
  const [provider, source = "default"] = sourceId.split(":")

  if (!provider || !source) {
    throw new SourceServiceError(
      "INVALID_FORMAT",
      "Invalid source ID format. Expected 'provider:source'",
    )
  }

  return { provider, source }
}

export function resolveSource(sourceId: string): RegisteredSourceDefinition<any> {
  const { provider, source } = parseSourceId(sourceId)
  const providerDefinition = providers[provider as keyof typeof providers]

  if (!providerDefinition) {
    throw new SourceServiceError(
      "PROVIDER_NOT_FOUND",
      `Provider '${provider}' not found`,
    )
  }

  const resolvedSource = providerDefinition.sources[source]
  if (!resolvedSource) {
    throw new SourceServiceError(
      "SOURCE_NOT_FOUND",
      `Source '${source}' not found in provider '${provider}'`,
    )
  }

  if (!resolvedSource.loader) {
    throw new SourceServiceError(
      "LOADER_NOT_FOUND",
      "Source does not have a loader",
    )
  }

  return resolvedSource
}

export function normalizeSourceParams<TParams extends SourceParamSchemaMap>(
  source: Pick<RegisteredSourceDefinition<TParams>, "params">,
  queryParams: Record<string, unknown> = {},
) {
  try {
    return parseSourceParams(source.params, queryParams)
  } catch (error) {
    if (error instanceof SourceParamValueError) {
      throw new SourceServiceError("INVALID_PARAMS", error.message)
    }

    throw error
  }
}

export function prepareSourceRequest<TParams extends SourceParamSchemaMap>(
  sourceId: string,
  queryParams: Record<string, unknown> = {},
): PreparedSourceRequest<TParams> {
  const source = resolveSource(sourceId) as RegisteredSourceDefinition<TParams>
  const params = normalizeSourceParams(source, queryParams)

  return {
    source,
    params,
  }
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
