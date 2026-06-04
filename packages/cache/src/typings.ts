import type { AdaptiveCacheAlgorithm, AdaptiveCacheMode, AdaptiveCacheState } from "@newsnext/cache-policy"

export type { AdaptiveCacheAlgorithm, AdaptiveCacheMode, AdaptiveCacheState } from "@newsnext/cache-policy"

export interface CacheEntry<T> {
  value: T
  updatedAt: number
}

export interface CacheAdapter {
  get: <T>(key: string) => Promise<CacheEntry<T> | undefined>
  set: <T>(key: string, value: T) => Promise<void>
  getPolicy: (key: string) => Promise<AdaptiveCacheState | undefined>
  setPolicy: (key: string, value: AdaptiveCacheState) => Promise<void>
}

export interface CacheResult<T> {
  items: T
  updated: number
  status: "success" | "cache"
}

export interface GetCachedSourceOptions<T> {
  key: string
  fetcher: () => Promise<T>
  minFetchAge?: number
  maxCacheAge?: number
  adaptiveMaxCacheAge?: boolean
  cacheMode?: AdaptiveCacheMode
  adaptiveAlgorithm?: AdaptiveCacheAlgorithm
  forceRefresh?: boolean
  waitUntil?: (promise: Promise<unknown>) => void
}
