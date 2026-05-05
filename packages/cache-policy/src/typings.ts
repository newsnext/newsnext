export type AdaptiveCacheMode = "timeline" | "hottest"
export type AdaptiveCacheAlgorithm = "balanced" | "responsive" | "economical" | "optimizer"

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

export interface UpdateAdaptiveCacheStateOptions {
  previous: unknown
  next: unknown
  state?: AdaptiveCacheState
  now: number
  minFetchAge: number
  maxCacheAge: number
  mode: AdaptiveCacheMode
  algorithm?: AdaptiveCacheAlgorithm
}

export interface UpdateAdaptiveCacheStateForErrorOptions {
  state?: AdaptiveCacheState
  now: number
  minFetchAge: number
  maxCacheAge: number
  algorithm?: AdaptiveCacheAlgorithm
}

export interface EffectiveMaxCacheAgeOptions {
  state?: AdaptiveCacheState
  now: number
  minFetchAge: number
  maxCacheAge: number
  algorithm?: AdaptiveCacheAlgorithm
}
