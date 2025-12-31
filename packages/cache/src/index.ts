import type { CacheAdapter, CacheResult, GetCachedSourceOptions } from "./typings"

const DEFAULT_TTL = 30 * 60 * 1000 // 30 minutes
const DEFAULT_INTERVAL = 1 * 60 * 1000 // 1 minutes

const pendingRequests = new Map<string, Promise<any>>()

export async function getCachedSource<T>(
  options: GetCachedSourceOptions<T>,
  adapter: CacheAdapter,
): Promise<CacheResult<T>> {
  const { key, fetcher, interval = DEFAULT_INTERVAL, ttl = DEFAULT_TTL, forceRefresh = false } = options
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

  if (cached) {
    const updated = cached.updatedAt

    // 1. Fresh cache
    if (now - updated < interval) {
      return {
        updated,
        status: "success",
        items: cached.value,
      }
    }

    // 2. Stale but valid within TTL
    if (now - updated < ttl) {
      if (!forceRefresh) {
        return {
          updated,
          status: "cache",
          items: cached.value,
        }
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

    const fetchPromise = (async () => {
      try {
        const items = await fetcher()
        if (!Array.isArray(items) || items.length === 0) {
          throw new Error("Invalid items: empty or not an array")
        }

        const setPromise = adapter.set(key, items).catch(e => console.error(`[Cache] Set failed for ${key}:`, e))
        if (options.waitUntil) {
          options.waitUntil(setPromise)
        } else {
          await setPromise
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
  } catch (err: any) {
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
