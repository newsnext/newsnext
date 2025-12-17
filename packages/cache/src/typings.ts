export interface CacheEntry<T> {
  value: T
  updatedAt: number
}

export interface CacheAdapter {
  get: <T>(key: string) => Promise<CacheEntry<T> | undefined>
  set: <T>(key: string, value: T) => Promise<void>
}

export interface CacheResult<T> {
  items: T
  updated: number
  status: "success" | "cache"
}

export interface GetCachedSourceOptions<T> {
  key: string
  fetcher: () => Promise<T>
  interval?: number
  ttl?: number
  forceRefresh?: boolean
}
