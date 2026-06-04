import type { AdaptiveCacheState } from "@newsnext/cache-policy"

export type { AdaptiveCacheState } from "@newsnext/cache-policy"

export interface CacheStorageEntry<T> {
  value: T
  updatedAt: number
}

export interface CacheStorage {
  get: <T>(key: string) => Promise<CacheStorageEntry<T> | undefined>
  set: <T>(key: string, value: T) => Promise<void>
  getPolicy: (key: string) => Promise<AdaptiveCacheState | undefined>
  setPolicy: (key: string, value: AdaptiveCacheState) => Promise<void>
}
