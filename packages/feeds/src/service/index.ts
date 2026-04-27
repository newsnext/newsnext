import type { CacheAdapter, CacheResult } from "@newsnext/cache"
import type { FeedParamSchemaMap, InferFeedParams, RegisteredFeedDefinition } from "../typings"
import { getCachedSource } from "@newsnext/cache"
import { stableStringify } from "@newsnext/shared/utils"
import { providers } from "../index"
import { FeedParamValueError } from "../typings"
import { parseFeedParams } from "../utils/params"

export type FeedErrorCode
  = | "FEED_NOT_FOUND"
    | "INVALID_PARAMS"
    | "INVALID_FORMAT"
    | "LOADER_NOT_FOUND"
    | "PROVIDER_NOT_FOUND"

export class FeedServiceError extends Error {
  readonly code: FeedErrorCode

  constructor(code: FeedErrorCode, message: string) {
    super(message)
    this.name = "FeedServiceError"
    this.code = code
  }
}

export interface ParsedFeedId {
  provider: string
  feed: string
}

export interface LoadFeedOptions {
  feedId: string
  params?: Record<string, unknown>
  paramsAreNormalized?: boolean
  adapter: CacheAdapter
  latest?: boolean
  waitUntil?: (promise: Promise<unknown>) => void
}

export interface FeedLoadResult<T> extends CacheResult<T> {
  id: string
  key: string
}

export interface PreparedFeedRequest<TParams extends FeedParamSchemaMap = FeedParamSchemaMap> {
  feed: RegisteredFeedDefinition<TParams>
  params: InferFeedParams<TParams>
}

export function parseFeedId(feedId: string): ParsedFeedId {
  const [provider, feed = "default"] = feedId.split(":")

  if (!provider || !feed) {
    throw new FeedServiceError(
      "INVALID_FORMAT",
      "Invalid feed ID format. Expected 'provider:feed'",
    )
  }

  return { provider, feed }
}

export function resolveFeed(feedId: string): RegisteredFeedDefinition<any> {
  const { provider, feed } = parseFeedId(feedId)
  const providerDefinition = providers[provider as keyof typeof providers]

  if (!providerDefinition) {
    throw new FeedServiceError(
      "PROVIDER_NOT_FOUND",
      `Provider '${provider}' not found`,
    )
  }

  const resolvedFeed = providerDefinition.feeds[feed]
  if (!resolvedFeed) {
    throw new FeedServiceError(
      "FEED_NOT_FOUND",
      `Feed '${feed}' not found in provider '${provider}'`,
    )
  }

  if (!resolvedFeed.loader) {
    throw new FeedServiceError(
      "LOADER_NOT_FOUND",
      "Feed does not have a loader",
    )
  }

  return resolvedFeed
}

export function normalizeFeedParams<TParams extends FeedParamSchemaMap>(
  feed: Pick<RegisteredFeedDefinition<TParams>, "params">,
  queryParams: Record<string, unknown> = {},
) {
  try {
    return parseFeedParams(feed.params, queryParams)
  } catch (error) {
    if (error instanceof FeedParamValueError) {
      throw new FeedServiceError("INVALID_PARAMS", error.message)
    }

    throw error
  }
}

export function prepareFeedRequest<TParams extends FeedParamSchemaMap>(
  feedId: string,
  queryParams: Record<string, unknown> = {},
): PreparedFeedRequest<TParams> {
  const feed = resolveFeed(feedId) as RegisteredFeedDefinition<TParams>
  const params = normalizeFeedParams(feed, queryParams)

  return {
    feed,
    params,
  }
}

export function buildFeedCacheKey(
  feedId: string,
  params: Record<string, unknown>,
): string {
  return `${feedId}:${stableStringify(params)}`
}

export async function loadFeed<T>({
  feedId,
  params: queryParams = {},
  paramsAreNormalized = false,
  adapter,
  latest = false,
  waitUntil,
}: LoadFeedOptions): Promise<FeedLoadResult<T>> {
  const feed = resolveFeed(feedId)
  const params = paramsAreNormalized
    ? queryParams
    : normalizeFeedParams(feed, queryParams)
  const key = buildFeedCacheKey(feedId, params)
  const result = await getCachedSource<T>({
    key,
    fetcher: () => feed.loader(params) as Promise<T>,
    forceRefresh: latest,
    waitUntil,
  }, adapter)

  return {
    id: feedId,
    key,
    ...result,
  }
}
