import type { CacheAdapter, CacheResult, GetCachedSourceOptions } from "./typings"
import {
  getBestAdaptiveCacheAlgorithm,
  getEffectiveMaxCacheAge,
  updateAdaptiveCacheState,
  updateAdaptiveCacheStateForError,
} from "@newsnext/cache-policy"

const DEFAULT_MAX_CACHE_AGE = 30 * 60 * 1000 // 30 minutes
const DEFAULT_MIN_FETCH_AGE = 1 * 60 * 1000 // 1 minute

const pendingRequests = new Map<string, Promise<unknown>>()

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
    adaptiveAlgorithm: configuredAdaptiveAlgorithm,
    forceRefresh = false,
  } = options
  const now = Date.now()
  const adaptiveAlgorithm = configuredAdaptiveAlgorithm ?? getBestAdaptiveCacheAlgorithm(cacheMode)

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
    ? getEffectiveMaxCacheAge({ state: adaptiveState, now, minFetchAge, maxCacheAge, algorithm: adaptiveAlgorithm })
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
          ? adapter.setPolicy(key, updateAdaptiveCacheState({
              previous: cached?.value,
              next: items,
              state: adaptiveState,
              now: Date.now(),
              minFetchAge,
              maxCacheAge,
              mode: cacheMode,
              algorithm: adaptiveAlgorithm,
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
      const errorPolicyPromise = adapter.setPolicy(key, updateAdaptiveCacheStateForError({
        state: adaptiveState,
        now: Date.now(),
        minFetchAge,
        maxCacheAge,
        algorithm: adaptiveAlgorithm,
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
