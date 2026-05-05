export interface CacheEntry<T> {
  value: T
  updatedAt: number
}

export type AdaptiveCacheMode = "timeline" | "hottest"

export interface AdaptiveCacheState {
  currentMaxCacheAge: number
  lastFingerprint?: string
  lastFetchedAt: number
  lastChangedAt?: number
  unchangedStreak: number
  errorStreak: number
  hourlyChangeScores: number[]
  averageChangeScore: number
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
  forceRefresh?: boolean
  waitUntil?: (promise: Promise<any>) => void
}
