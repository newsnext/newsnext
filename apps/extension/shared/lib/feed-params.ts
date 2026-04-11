import type { FeedParamSchema } from "@newsnext/feeds/typings"

export const FEED_PARAMS_STORAGE_PREFIX = "newsnext-feed-params"

export type FeedParamValues = Record<string, unknown>

export function getFeedParamsStorageKey(instanceId: string): string {
  return `${FEED_PARAMS_STORAGE_PREFIX}/${instanceId}`
}

export function getDefaultFeedParamValues(params?: Record<string, FeedParamSchema>): FeedParamValues {
  if (!params) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(params).map(([key, param]) => [key, param.default]),
  )
}

export function sanitizeFeedParamValues(
  values: FeedParamValues | undefined,
  params?: Record<string, FeedParamSchema>,
): FeedParamValues {
  const defaults = getDefaultFeedParamValues(params)

  if (!params) {
    return {}
  }

  if (!values) {
    return defaults
  }

  return Object.fromEntries(
    Object.keys(params).map(key => [key, values[key] ?? defaults[key]]),
  )
}

export function readStoredFeedParamValues(instanceId: string): FeedParamValues | undefined {
  if (typeof window === "undefined") {
    return undefined
  }

  const stored = window.localStorage.getItem(getFeedParamsStorageKey(instanceId))
  if (!stored) {
    return undefined
  }

  try {
    return JSON.parse(stored) as FeedParamValues
  } catch {
    window.localStorage.removeItem(getFeedParamsStorageKey(instanceId))
    return undefined
  }
}

export function getSavedFeedParamValues(
  instanceId: string,
  params?: Record<string, FeedParamSchema>,
): FeedParamValues {
  return sanitizeFeedParamValues(readStoredFeedParamValues(instanceId), params)
}

export function writeStoredFeedParamValues(instanceId: string, values: FeedParamValues): void {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(getFeedParamsStorageKey(instanceId), JSON.stringify(values))
}

export function deleteStoredFeedParamValues(instanceId: string): void {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.removeItem(getFeedParamsStorageKey(instanceId))
}
