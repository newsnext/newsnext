import type {
  AdaptiveCacheMode,
  AdaptiveCacheState,
  CacheAdapter,
  CacheResult,
  GetCachedSourceOptions,
} from "./typings"

const DEFAULT_MAX_CACHE_AGE = 30 * 60 * 1000 // 30 minutes
const DEFAULT_MIN_FETCH_AGE = 1 * 60 * 1000 // 1 minute
const ADAPTIVE_TOP_ITEM_COUNT = 10
const ADAPTIVE_EWMA_ALPHA = 0.3
const ADAPTIVE_HOTTEST_CHANGE_THRESHOLD = 0.2
const ADAPTIVE_TIMELINE_CHANGE_THRESHOLD = 0.01
const ADAPTIVE_MAX_QUIET_MULTIPLIER = 4

const pendingRequests = new Map<string, Promise<unknown>>()

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function getIdentity(item: unknown): string {
  if (item && typeof item === "object") {
    const record = item as Record<string, unknown>
    const identity = record.id ?? record.url ?? record.link ?? record.title
    if (identity !== undefined && identity !== null) {
      return String(identity)
    }
  }

  return JSON.stringify(item) ?? String(item)
}

function getTopIdentities(value: unknown, count = ADAPTIVE_TOP_ITEM_COUNT): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.slice(0, count).map(getIdentity)
}

function getFingerprint(value: unknown, mode: AdaptiveCacheMode): string {
  const identities = getTopIdentities(value)
  if (mode === "timeline") {
    return identities.join("\n")
  }

  return identities.map((identity, index) => `${index}:${identity}`).join("\n")
}

function getTimelineChangeScore(previous: unknown, next: unknown): number {
  const previousIdentities = new Set(getTopIdentities(previous))
  const nextIdentities = getTopIdentities(next)
  if (nextIdentities.length === 0) {
    return 0
  }

  const newLeadingItems = nextIdentities.filter(identity => !previousIdentities.has(identity)).length
  return newLeadingItems / nextIdentities.length
}

function getHottestChangeScore(previous: unknown, next: unknown): number {
  const previousIdentities = getTopIdentities(previous)
  const nextIdentities = getTopIdentities(next)
  if (nextIdentities.length === 0) {
    return 0
  }

  const previousPositions = new Map(previousIdentities.map((identity, index) => [identity, index]))
  const maxMovement = Math.max(nextIdentities.length - 1, 1)
  const totalScore = nextIdentities.reduce((sum, identity, index) => {
    const previousIndex = previousPositions.get(identity)
    if (previousIndex === undefined) {
      return sum + 1
    }

    return sum + Math.abs(previousIndex - index) / maxMovement
  }, 0)

  return totalScore / nextIdentities.length
}

function getChangeScore(previous: unknown, next: unknown, mode: AdaptiveCacheMode): number {
  if (previous === undefined) {
    return 1
  }

  return mode === "timeline"
    ? getTimelineChangeScore(previous, next)
    : getHottestChangeScore(previous, next)
}

function getCurrentUtcHour(now: number): number {
  return new Date(now).getUTCHours()
}

function getQuietMultiplier(state: AdaptiveCacheState | undefined, now: number): number {
  if (!state) {
    return 1
  }

  const hour = getCurrentUtcHour(now)
  const hourScore = state.hourlyChangeScores[hour] ?? state.averageChangeScore
  const activity = 0.7 * hourScore + 0.3 * state.averageChangeScore
  return clamp(1 / Math.max(activity, 0.25), 1, ADAPTIVE_MAX_QUIET_MULTIPLIER)
}

function getEffectiveMaxCacheAge(
  state: AdaptiveCacheState | undefined,
  now: number,
  minFetchAge: number,
  maxCacheAge: number,
): number {
  if (!state) {
    return minFetchAge
  }

  const quietMultiplier = getQuietMultiplier(state, now)
  return clamp(state.currentMaxCacheAge * quietMultiplier, minFetchAge, maxCacheAge)
}

function createInitialAdaptiveState(now: number, minFetchAge: number): AdaptiveCacheState {
  return {
    currentMaxCacheAge: minFetchAge,
    lastFetchedAt: now,
    unchangedStreak: 0,
    errorStreak: 0,
    hourlyChangeScores: Array.from({ length: 24 }, () => 0.5),
    averageChangeScore: 0.5,
  }
}

function updateHourlyChangeScores(state: AdaptiveCacheState, now: number, changeScore: number): number[] {
  const hour = getCurrentUtcHour(now)
  const scores = Array.from({ length: 24 }, (_, index) => state.hourlyChangeScores[index] ?? state.averageChangeScore)
  scores[hour] = ADAPTIVE_EWMA_ALPHA * changeScore + (1 - ADAPTIVE_EWMA_ALPHA) * scores[hour]
  return scores
}

function updateAdaptiveState({
  previous,
  next,
  state,
  now,
  minFetchAge,
  maxCacheAge,
  mode,
}: {
  previous: unknown
  next: unknown
  state: AdaptiveCacheState | undefined
  now: number
  minFetchAge: number
  maxCacheAge: number
  mode: AdaptiveCacheMode
}): AdaptiveCacheState {
  const currentState = state ?? createInitialAdaptiveState(now, minFetchAge)
  const changeScore = getChangeScore(previous, next, mode)
  const changed = mode === "timeline"
    ? changeScore >= ADAPTIVE_TIMELINE_CHANGE_THRESHOLD
    : changeScore >= ADAPTIVE_HOTTEST_CHANGE_THRESHOLD
  const currentMaxCacheAge = changed
    ? mode === "timeline"
      ? minFetchAge
      : clamp(currentState.currentMaxCacheAge * 0.7, minFetchAge, maxCacheAge)
    : clamp(currentState.currentMaxCacheAge + minFetchAge, minFetchAge, maxCacheAge)
  const averageChangeScore = ADAPTIVE_EWMA_ALPHA * changeScore + (1 - ADAPTIVE_EWMA_ALPHA) * currentState.averageChangeScore

  return {
    currentMaxCacheAge,
    lastFingerprint: getFingerprint(next, mode),
    lastFetchedAt: now,
    lastChangedAt: changed ? now : currentState.lastChangedAt,
    unchangedStreak: changed ? 0 : currentState.unchangedStreak + 1,
    errorStreak: 0,
    hourlyChangeScores: updateHourlyChangeScores(currentState, now, changeScore),
    averageChangeScore,
  }
}

function updateAdaptiveStateForError({
  state,
  now,
  minFetchAge,
  maxCacheAge,
}: {
  state: AdaptiveCacheState | undefined
  now: number
  minFetchAge: number
  maxCacheAge: number
}): AdaptiveCacheState {
  const currentState = state ?? createInitialAdaptiveState(now, minFetchAge)
  const errorStreak = currentState.errorStreak + 1

  return {
    ...currentState,
    currentMaxCacheAge: clamp(minFetchAge * 2 ** errorStreak, minFetchAge, maxCacheAge),
    lastFetchedAt: now,
    errorStreak,
  }
}

export async function getCachedSource<T>(
  options: GetCachedSourceOptions<T>,
  adapter: CacheAdapter,
): Promise<CacheResult<T>> {
  const {
    key,
    fetcher,
    minFetchAge = DEFAULT_MIN_FETCH_AGE,
    maxCacheAge = DEFAULT_MAX_CACHE_AGE,
    adaptiveMaxCacheAge = false,
    cacheMode = "hottest",
    forceRefresh = false,
  } = options
  const now = Date.now()

  // Disable cache in DEV environment
  const disableCache = process.env.CACHE === "false"
  if (disableCache) {
    const items = await fetcher()
    if (Array.isArray(items) && items.length > 0) {
      return {
        updated: Date.now(),
        status: "success",
        items,
      }
    }
  }

  const cached = await adapter.get<T>(key)
  const adaptiveState = adaptiveMaxCacheAge
    ? await adapter.getPolicy(key)
    : undefined
  const effectiveMaxCacheAge = adaptiveMaxCacheAge
    ? getEffectiveMaxCacheAge(adaptiveState, now, minFetchAge, maxCacheAge)
    : maxCacheAge

  if (cached) {
    const updated = cached.updatedAt

    // 1. Fresh cache
    if (!forceRefresh && now - updated < minFetchAge) {
      return {
        updated,
        status: "success",
        items: cached.value,
      }
    }

    // 2. Stale but valid within max cache age
    if (!forceRefresh && now - updated < effectiveMaxCacheAge) {
      return {
        updated,
        status: "cache",
        items: cached.value,
      }
    }
  }

  try {
    // Optimization: Request Coalescing
    if (pendingRequests.has(key)) {
      const items = await pendingRequests.get(key)
      return {
        updated: Date.now(),
        status: "success",
        items: items as T,
      }
    }

    const fetchPromise = (async (): Promise<T> => {
      try {
        const items = await fetcher()
        if (!Array.isArray(items) || items.length === 0) {
          throw new Error("Invalid items: empty or not an array")
        }

        const setPromise = adapter.set(key, items).catch(e => console.error(`[Cache] Set failed for ${key}:`, e))
        const policyPromise = adaptiveMaxCacheAge
          ? adapter.setPolicy(key, updateAdaptiveState({
              previous: cached?.value,
              next: items,
              state: adaptiveState,
              now: Date.now(),
              minFetchAge,
              maxCacheAge,
              mode: cacheMode,
            })).catch(e => console.error(`[Cache] Adaptive policy set failed for ${key}:`, e))
          : undefined
        if (options.waitUntil) {
          options.waitUntil(policyPromise ? Promise.all([setPromise, policyPromise]).then(() => undefined) : setPromise)
        } else {
          await setPromise
          await policyPromise
        }
        return items
      } finally {
        pendingRequests.delete(key)
      }
    })()

    pendingRequests.set(key, fetchPromise)
    const items = await fetchPromise

    return {
      updated: Date.now(),
      status: "success",
      items,
    }
  } catch (err) {
    if (adaptiveMaxCacheAge) {
      const errorPolicyPromise = adapter.setPolicy(key, updateAdaptiveStateForError({
        state: adaptiveState,
        now: Date.now(),
        minFetchAge,
        maxCacheAge,
      })).catch(e => console.error(`[Cache] Adaptive policy set failed for ${key}:`, e))
      if (options.waitUntil) {
        options.waitUntil(errorPolicyPromise)
      } else {
        await errorPolicyPromise
      }
    }

    if (cached) {
      return {
        updated: cached.updatedAt,
        status: "cache",
        items: cached.value,
      }
    }
    throw err
  }
}

export * from "./typings"
