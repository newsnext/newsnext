import type { AdaptiveCacheState, CacheAdapter, CacheEntry } from "./typings"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getCachedSource } from "./index"

class MemoryCacheAdapter implements CacheAdapter {
  entries = new Map<string, CacheEntry<unknown>>()
  policies = new Map<string, AdaptiveCacheState>()

  async get<T>(key: string): Promise<CacheEntry<T> | undefined> {
    return this.entries.get(key) as CacheEntry<T> | undefined
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.entries.set(key, {
      value,
      updatedAt: Date.now(),
    })
  }

  async getPolicy(key: string): Promise<AdaptiveCacheState | undefined> {
    return this.policies.get(key)
  }

  async setPolicy(key: string, value: AdaptiveCacheState): Promise<void> {
    this.policies.set(key, value)
  }
}

const minute = 60_000

function setCachedItems(adapter: MemoryCacheAdapter, value: unknown[], updatedAt: number): void {
  adapter.entries.set("source", { value, updatedAt })
}

function createAdaptiveState(overrides: Partial<AdaptiveCacheState> = {}): AdaptiveCacheState {
  return {
    currentMaxCacheAge: minute,
    lastFetchedAt: 0,
    unchangedStreak: 0,
    errorStreak: 0,
    hourlyChangeScores: Array.from({ length: 24 }).fill(1),
    averageChangeScore: 1,
    ...overrides,
  }
}

describe("getCachedSource", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it("returns fresh cache while it is younger than minFetchAge", async () => {
    vi.setSystemTime(1_000)
    const adapter = new MemoryCacheAdapter()
    setCachedItems(adapter, ["cached"], 500)
    const fetcher = vi.fn(async () => ["fresh"])

    const result = await getCachedSource({
      key: "source",
      fetcher,
      minFetchAge: 1_000,
      maxCacheAge: 5_000,
    }, adapter)

    expect(result).toEqual({
      updated: 500,
      status: "success",
      items: ["cached"],
    })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it("returns stale cache while it is younger than maxCacheAge", async () => {
    vi.setSystemTime(2_000)
    const adapter = new MemoryCacheAdapter()
    setCachedItems(adapter, ["cached"], 500)
    const fetcher = vi.fn(async () => ["fresh"])

    const result = await getCachedSource({
      key: "source",
      fetcher,
      minFetchAge: 1_000,
      maxCacheAge: 5_000,
    }, adapter)

    expect(result).toEqual({
      updated: 500,
      status: "cache",
      items: ["cached"],
    })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it("fetches when cached data reaches maxCacheAge", async () => {
    vi.setSystemTime(5_500)
    const adapter = new MemoryCacheAdapter()
    setCachedItems(adapter, ["cached"], 500)
    const fetcher = vi.fn(async () => ["fresh"])

    const result = await getCachedSource({
      key: "source",
      fetcher,
      minFetchAge: 1_000,
      maxCacheAge: 5_000,
    }, adapter)

    expect(result).toEqual({
      updated: 5_500,
      status: "success",
      items: ["fresh"],
    })
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it("force refresh bypasses minFetchAge and corrects adaptive policy", async () => {
    const now = Date.UTC(2026, 0, 1, 3, 5, 0)
    vi.setSystemTime(now)
    const adapter = new MemoryCacheAdapter()
    setCachedItems(adapter, [{ id: "old" }], now - 5 * minute)
    adapter.policies.set("source", createAdaptiveState({
      currentMaxCacheAge: 30 * minute,
      unchangedStreak: 12,
      hourlyChangeScores: Array.from({ length: 24 }).fill(0),
      averageChangeScore: 0,
      lastChangedAt: now - 6 * 60 * minute,
    }))
    const fetcher = vi.fn(async () => [{ id: "new" }, { id: "old" }])

    const refreshed = await getCachedSource({
      key: "source",
      fetcher,
      minFetchAge: minute,
      maxCacheAge: 30 * minute,
      adaptiveMaxCacheAge: true,
      cacheMode: "timeline",
      forceRefresh: true,
    }, adapter)
    const correctedState = await adapter.getPolicy("source")

    expect(refreshed.items).toEqual([{ id: "new" }, { id: "old" }])
    expect(fetcher).toHaveBeenCalledOnce()
    expect(correctedState?.currentMaxCacheAge).toBe(minute)
    expect(correctedState?.unchangedStreak).toBe(0)
    expect(correctedState?.lastChangedAt).toBe(now)
  })

  it("persists adaptive policy through adapter policy storage", async () => {
    vi.setSystemTime(0)
    const adapter = new MemoryCacheAdapter()
    const initialFetcher = vi.fn(async () => [{ id: "a" }])

    await getCachedSource({
      key: "source",
      fetcher: initialFetcher,
      minFetchAge: minute,
      adaptiveMaxCacheAge: true,
      cacheMode: "timeline",
    }, adapter)

    vi.setSystemTime(2 * minute)
    const unchangedFetcher = vi.fn(async () => [{ id: "a" }])
    await getCachedSource({
      key: "source",
      fetcher: unchangedFetcher,
      minFetchAge: minute,
      adaptiveMaxCacheAge: true,
      cacheMode: "timeline",
      forceRefresh: true,
    }, adapter)

    vi.setSystemTime(3 * minute + 30_000)
    const persistedPolicyFetcher = vi.fn(async () => [{ id: "new" }])
    const result = await getCachedSource({
      key: "source",
      fetcher: persistedPolicyFetcher,
      minFetchAge: minute,
      adaptiveMaxCacheAge: true,
      cacheMode: "timeline",
    }, adapter)
    const persistedPolicy = await adapter.getPolicy("source")

    expect(result.status).toBe("cache")
    expect(result.items).toEqual([{ id: "a" }])
    expect(persistedPolicyFetcher).not.toHaveBeenCalled()
    expect(persistedPolicy?.currentMaxCacheAge).toBe(96_000)
  })

  it("falls back to cache and updates policy after fetch errors", async () => {
    vi.setSystemTime(2 * minute)
    const adapter = new MemoryCacheAdapter()
    setCachedItems(adapter, [{ id: "cached" }], 0)
    const fetcher = vi.fn(async (): Promise<Array<{ id: string }>> => {
      throw new Error("upstream failed")
    })

    const result = await getCachedSource({
      key: "source",
      fetcher,
      minFetchAge: minute,
      maxCacheAge: 30 * minute,
      adaptiveMaxCacheAge: true,
      cacheMode: "timeline",
    }, adapter)
    const state = await adapter.getPolicy("source")

    expect(result.status).toBe("cache")
    expect(result.items).toEqual([{ id: "cached" }])
    expect(state?.errorStreak).toBe(1)
    expect(state?.currentMaxCacheAge).toBe(150_000)
  })
})
