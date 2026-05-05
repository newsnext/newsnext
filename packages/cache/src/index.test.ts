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

class DatabaseCacheAdapter implements CacheAdapter {
  private readonly database: Map<string, CacheEntry<unknown>>
  private readonly policies: Map<string, AdaptiveCacheState>

  constructor(database: Map<string, CacheEntry<unknown>>, policies: Map<string, AdaptiveCacheState>) {
    this.database = database
    this.policies = policies
  }

  async get<T>(key: string): Promise<CacheEntry<T> | undefined> {
    return this.database.get(key) as CacheEntry<T> | undefined
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.database.set(key, {
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

interface BenchmarkItem {
  id: string
}

interface BenchmarkSnapshot {
  items: BenchmarkItem[]
  version: number
  changedAt: number
}

interface BenchmarkResult {
  fetches: number
  stalePolls: number
  averageStaleLag: number
  finalAdaptiveAge?: number
}

function setCachedItems(adapter: MemoryCacheAdapter, value: unknown[], updatedAt: number): void {
  adapter.entries.set("source", { value, updatedAt })
}

function createAdaptiveState(overrides: Partial<AdaptiveCacheState> = {}): AdaptiveCacheState {
  return {
    currentMaxCacheAge: 1_000,
    lastFetchedAt: 0,
    unchangedStreak: 0,
    errorStreak: 0,
    hourlyChangeScores: Array.from({ length: 24 }, () => 1),
    averageChangeScore: 1,
    ...overrides,
  }
}

function setAdaptiveState(adapter: MemoryCacheAdapter, state: AdaptiveCacheState): void {
  adapter.policies.set("source", state)
}

function getAdaptiveState(adapter: MemoryCacheAdapter): AdaptiveCacheState {
  const policy = adapter.policies.get("source")
  if (!policy) {
    throw new Error("Missing adaptive state")
  }

  return policy
}


function getTimelineVersion(currentMinute: number): number {
  if (currentMinute < 60) {
    return Math.floor(currentMinute / 2)
  }
  if (currentMinute < 180) {
    return 30 + Math.floor((currentMinute - 60) / 30)
  }
  if (currentMinute < 240) {
    return 34 + Math.floor((currentMinute - 180) / 3)
  }
  return 54 + Math.floor((currentMinute - 240) / 60)
}

function getHottestVersion(currentMinute: number): number {
  if (currentMinute < 90) {
    return Math.floor(currentMinute / 10)
  }
  if (currentMinute < 210) {
    return 9 + Math.floor((currentMinute - 90) / 45)
  }
  if (currentMinute < 270) {
    return 12 + Math.floor((currentMinute - 210) / 12)
  }
  return 17 + Math.floor((currentMinute - 270) / 60)
}

function getChangedAt(currentMinute: number, getVersion: (currentMinute: number) => number): number {
  const version = getVersion(currentMinute)
  for (let candidate = currentMinute; candidate >= 0; candidate--) {
    if (getVersion(candidate) !== version) {
      return (candidate + 1) * minute
    }
  }

  return 0
}

function getVersionChangedAt(version: number, getVersion: (currentMinute: number) => number, currentMinute: number): number {
  for (let candidate = 0; candidate <= currentMinute; candidate++) {
    if (getVersion(candidate) === version) {
      return candidate * minute
    }
  }

  return 0
}

function createTimelineSnapshot(now: number): BenchmarkSnapshot {
  const currentMinute = Math.floor(now / minute)
  const version = getTimelineVersion(currentMinute)
  return {
    version,
    changedAt: getChangedAt(currentMinute, getTimelineVersion),
    items: [
      { id: `timeline-${version}` },
      { id: `timeline-${Math.max(0, version - 1)}` },
      { id: `timeline-${Math.max(0, version - 2)}` },
    ],
  }
}

function createHottestSnapshot(now: number): BenchmarkSnapshot {
  const currentMinute = Math.floor(now / minute)
  const version = getHottestVersion(currentMinute)
  const jitter = currentMinute % 2 === 0
  const stableTail = [
    { id: `hot-${version}-c` },
    { id: `hot-${version}-d` },
    { id: `hot-${version}-e` },
  ]

  return {
    version,
    changedAt: getChangedAt(currentMinute, getHottestVersion),
    items: jitter
      ? [{ id: `hot-${version}-b` }, { id: `hot-${version}-a` }, ...stableTail]
      : [{ id: `hot-${version}-a` }, { id: `hot-${version}-b` }, ...stableTail],
  }
}

function getServedVersion(items: BenchmarkItem[], prefix: string): number {
  const id = items[0]?.id ?? ""
  const match = id.match(new RegExp(`^${prefix}-(\\d+)`))
  if (!match) {
    throw new Error(`Unable to parse benchmark version from ${id}`)
  }

  return Number(match[1])
}

async function runBenchmark({
  createSnapshot,
  getVersion,
  cacheMode,
  adaptiveMaxCacheAge,
  maxCacheAge,
  durationMinutes,
  prefix,
}: {
  createSnapshot: (now: number) => BenchmarkSnapshot
  getVersion: (currentMinute: number) => number
  cacheMode: "timeline" | "hottest"
  adaptiveMaxCacheAge: boolean
  maxCacheAge: number
  durationMinutes: number
  prefix: string
}): Promise<BenchmarkResult> {
  const adapter = new MemoryCacheAdapter()
  const fetcher = vi.fn(async () => createSnapshot(Date.now()).items)
  let stalePolls = 0
  let staleLag = 0

  for (let currentMinute = 0; currentMinute <= durationMinutes; currentMinute++) {
    const now = currentMinute * minute
    vi.setSystemTime(now)
    const result = await getCachedSource<BenchmarkItem[]>({
      key: "source",
      fetcher,
      minFetchAge: minute,
      maxCacheAge,
      adaptiveMaxCacheAge,
      cacheMode,
    }, adapter)
    const latest = createSnapshot(now)
    const servedVersion = getServedVersion(result.items, prefix)
    if (servedVersion < latest.version) {
      stalePolls += 1
      staleLag += now - getVersionChangedAt(servedVersion, getVersion, currentMinute)
    }
  }

  return {
    fetches: fetcher.mock.calls.length,
    stalePolls,
    averageStaleLag: staleLag / (durationMinutes + 1),
    finalAdaptiveAge: adaptiveMaxCacheAge ? getAdaptiveState(adapter).currentMaxCacheAge : undefined,
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

  it("force refresh bypasses minFetchAge", async () => {
    vi.setSystemTime(1_000)
    const adapter = new MemoryCacheAdapter()
    setCachedItems(adapter, ["cached"], 500)
    const fetcher = vi.fn(async () => ["fresh"])

    const result = await getCachedSource({
      key: "source",
      fetcher,
      minFetchAge: 1_000,
      maxCacheAge: 5_000,
      forceRefresh: true,
    }, adapter)

    expect(result.items).toEqual(["fresh"])
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it("adaptive cache starts from minFetchAge before growing", async () => {
    vi.setSystemTime(1_600)
    const adapter = new MemoryCacheAdapter()
    setCachedItems(adapter, [{ id: "a" }], 500)
    const fetcher = vi.fn(async () => [{ id: "a" }])

    const result = await getCachedSource({
      key: "source",
      fetcher,
      minFetchAge: 1_000,
      maxCacheAge: 10_000,
      adaptiveMaxCacheAge: true,
      cacheMode: "timeline",
    }, adapter)

    expect(result.items).toEqual([{ id: "a" }])
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it("adaptive cache grows after unchanged timeline fetches", async () => {
    vi.setSystemTime(2_000)
    const adapter = new MemoryCacheAdapter()
    setCachedItems(adapter, [{ id: "a" }], 500)
    const fetcher = vi.fn(async () => [{ id: "a" }])

    await getCachedSource({
      key: "source",
      fetcher,
      minFetchAge: 1_000,
      maxCacheAge: 10_000,
      adaptiveMaxCacheAge: true,
      cacheMode: "timeline",
    }, adapter)

    expect(getAdaptiveState(adapter).currentMaxCacheAge).toBe(2_000)

    vi.setSystemTime(3_500)
    const secondFetcher = vi.fn(async () => [{ id: "fresh" }])
    const result = await getCachedSource({
      key: "source",
      fetcher: secondFetcher,
      minFetchAge: 1_000,
      maxCacheAge: 10_000,
      adaptiveMaxCacheAge: true,
      cacheMode: "timeline",
    }, adapter)

    expect(result.status).toBe("cache")
    expect(result.items).toEqual([{ id: "a" }])
    expect(secondFetcher).not.toHaveBeenCalled()
  })

  it("adaptive timeline mode reduces age when new items appear", async () => {
    vi.setSystemTime(4_500)
    const adapter = new MemoryCacheAdapter()
    setCachedItems(adapter, [{ id: "a" }, { id: "b" }], 0)
    setAdaptiveState(adapter, createAdaptiveState({ currentMaxCacheAge: 4_000 }))
    const fetcher = vi.fn(async () => [{ id: "c" }, { id: "a" }, { id: "b" }])

    await getCachedSource({
      key: "source",
      fetcher,
      minFetchAge: 1_000,
      maxCacheAge: 10_000,
      adaptiveMaxCacheAge: true,
      cacheMode: "timeline",
    }, adapter)

    const state = getAdaptiveState(adapter)
    expect(state.currentMaxCacheAge).toBe(1_000)
    expect(state.unchangedStreak).toBe(0)
    expect(state.lastChangedAt).toBe(4_500)
  })

  it("adaptive hottest mode tolerates small ranking movement", async () => {
    vi.setSystemTime(2_500)
    const adapter = new MemoryCacheAdapter()
    setCachedItems(adapter, [
      { id: "a" },
      { id: "b" },
      { id: "c" },
      { id: "d" },
      { id: "e" },
    ], 0)
    setAdaptiveState(adapter, createAdaptiveState({ currentMaxCacheAge: 1_000 }))
    const fetcher = vi.fn(async () => [
      { id: "b" },
      { id: "a" },
      { id: "c" },
      { id: "d" },
      { id: "e" },
    ])

    await getCachedSource({
      key: "source",
      fetcher,
      minFetchAge: 1_000,
      maxCacheAge: 10_000,
      adaptiveMaxCacheAge: true,
      cacheMode: "hottest",
    }, adapter)

    const state = getAdaptiveState(adapter)
    expect(state.currentMaxCacheAge).toBe(2_000)
    expect(state.unchangedStreak).toBe(1)
    expect(state.lastChangedAt).toBeUndefined()
  })

  it("quiet UTC hours extend adaptive cache without exceeding maxCacheAge", async () => {
    vi.setSystemTime(Date.UTC(2026, 0, 1, 3, 0, 2))
    const adapter = new MemoryCacheAdapter()
    setCachedItems(adapter, [{ id: "cached" }], Date.UTC(2026, 0, 1, 3, 0, 0))
    setAdaptiveState(adapter, createAdaptiveState({
      currentMaxCacheAge: 1_000,
      hourlyChangeScores: Array.from({ length: 24 }, () => 0),
      averageChangeScore: 0,
    }))
    const fetcher = vi.fn(async () => [{ id: "fresh" }])

    const result = await getCachedSource({
      key: "source",
      fetcher,
      minFetchAge: 1_000,
      maxCacheAge: 3_000,
      adaptiveMaxCacheAge: true,
      cacheMode: "timeline",
    }, adapter)

    expect(result.status).toBe("cache")
    expect(result.items).toEqual([{ id: "cached" }])
    expect(fetcher).not.toHaveBeenCalled()

    vi.setSystemTime(Date.UTC(2026, 0, 1, 3, 0, 4))
    const expiredResult = await getCachedSource({
      key: "source",
      fetcher,
      minFetchAge: 1_000,
      maxCacheAge: 3_000,
      adaptiveMaxCacheAge: true,
      cacheMode: "timeline",
    }, adapter)

    expect(expiredResult.status).toBe("success")
    expect(expiredResult.items).toEqual([{ id: "fresh" }])
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it("force refresh corrects adaptive policy after a source was learned as quiet", async () => {
    const quietHour = Date.UTC(2026, 0, 1, 3, 0, 0)
    vi.setSystemTime(quietHour + 5 * minute)
    const adapter = new MemoryCacheAdapter()
    setCachedItems(adapter, [{ id: "old" }], quietHour)
    setAdaptiveState(adapter, createAdaptiveState({
      currentMaxCacheAge: 30 * minute,
      unchangedStreak: 12,
      hourlyChangeScores: Array.from({ length: 24 }, () => 0),
      averageChangeScore: 0,
      lastChangedAt: quietHour - 6 * 60 * minute,
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

    const correctedState = getAdaptiveState(adapter)
    expect(refreshed.items).toEqual([{ id: "new" }, { id: "old" }])
    expect(fetcher).toHaveBeenCalledOnce()
    expect(correctedState.currentMaxCacheAge).toBe(minute)
    expect(correctedState.unchangedStreak).toBe(0)
    expect(correctedState.lastChangedAt).toBe(quietHour + 5 * minute)
    expect(correctedState.averageChangeScore).toBeGreaterThan(0)
    expect(correctedState.hourlyChangeScores[3]).toBeGreaterThan(0)
  })

  it("persists adaptive policy through cache adapter storage", async () => {
    const database = new Map<string, CacheEntry<unknown>>()
    const policies = new Map<string, AdaptiveCacheState>()
    vi.setSystemTime(0)
    let adapter = new DatabaseCacheAdapter(database, policies)
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

    adapter = new DatabaseCacheAdapter(database, policies)
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
    expect(persistedPolicy?.currentMaxCacheAge).toBe(2 * minute)
  })

  it("simulates timeline polling that grows during quiet periods and shrinks when new items arrive", async () => {
    const adapter = new MemoryCacheAdapter()
    const fetcher = vi.fn<() => Promise<Array<{ id: string }>>>()
    const options = {
      key: "source",
      fetcher,
      minFetchAge: 1_000,
      maxCacheAge: 10_000,
      adaptiveMaxCacheAge: true,
      cacheMode: "timeline" as const,
      forceRefresh: true,
    }

    vi.setSystemTime(0)
    fetcher.mockResolvedValueOnce([{ id: "a" }])
    await getCachedSource(options, adapter)
    expect(getAdaptiveState(adapter).currentMaxCacheAge).toBe(1_000)

    vi.setSystemTime(10_000)
    fetcher.mockResolvedValueOnce([{ id: "a" }])
    await getCachedSource(options, adapter)
    expect(getAdaptiveState(adapter).currentMaxCacheAge).toBe(2_000)

    vi.setSystemTime(20_000)
    fetcher.mockResolvedValueOnce([{ id: "a" }])
    await getCachedSource(options, adapter)
    const quietState = getAdaptiveState(adapter)
    expect(quietState.currentMaxCacheAge).toBe(3_000)
    expect(quietState.unchangedStreak).toBe(2)

    vi.setSystemTime(30_000)
    fetcher.mockResolvedValueOnce([{ id: "b" }, { id: "a" }])
    await getCachedSource(options, adapter)
    const activeState = getAdaptiveState(adapter)
    expect(activeState.currentMaxCacheAge).toBe(1_000)
    expect(activeState.unchangedStreak).toBe(0)
    expect(activeState.lastChangedAt).toBe(30_000)
    expect(fetcher).toHaveBeenCalledTimes(4)
  })

  it("simulates hottest polling that ignores small rank jitter and reacts to major reshuffles", async () => {
    const adapter = new MemoryCacheAdapter()
    const fetcher = vi.fn<() => Promise<Array<{ id: string }>>>()
    const options = {
      key: "source",
      fetcher,
      minFetchAge: 1_000,
      maxCacheAge: 10_000,
      adaptiveMaxCacheAge: true,
      cacheMode: "hottest" as const,
      forceRefresh: true,
    }

    vi.setSystemTime(0)
    fetcher.mockResolvedValueOnce([
      { id: "a" },
      { id: "b" },
      { id: "c" },
      { id: "d" },
      { id: "e" },
    ])
    await getCachedSource(options, adapter)

    vi.setSystemTime(10_000)
    fetcher.mockResolvedValueOnce([
      { id: "b" },
      { id: "a" },
      { id: "c" },
      { id: "d" },
      { id: "e" },
    ])
    await getCachedSource(options, adapter)
    const jitterState = getAdaptiveState(adapter)
    expect(jitterState.currentMaxCacheAge).toBe(2_000)
    expect(jitterState.unchangedStreak).toBe(1)

    vi.setSystemTime(20_000)
    fetcher.mockResolvedValueOnce([
      { id: "x" },
      { id: "y" },
      { id: "z" },
      { id: "a" },
      { id: "b" },
    ])
    await getCachedSource(options, adapter)
    const reshuffledState = getAdaptiveState(adapter)
    expect(reshuffledState.currentMaxCacheAge).toBe(1_400)
    expect(reshuffledState.unchangedStreak).toBe(0)
    expect(reshuffledState.lastChangedAt).toBe(20_000)
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it("benchmarks timeline adaptive caching against fixed fast and fixed max policies", async () => {
    const fixedFast = await runBenchmark({
      createSnapshot: createTimelineSnapshot,
      getVersion: getTimelineVersion,
      cacheMode: "timeline",
      adaptiveMaxCacheAge: false,
      maxCacheAge: minute,
      durationMinutes: 360,
      prefix: "timeline",
    })
    const fixedMax = await runBenchmark({
      createSnapshot: createTimelineSnapshot,
      getVersion: getTimelineVersion,
      cacheMode: "timeline",
      adaptiveMaxCacheAge: false,
      maxCacheAge: 30 * minute,
      durationMinutes: 360,
      prefix: "timeline",
    })
    const adaptive = await runBenchmark({
      createSnapshot: createTimelineSnapshot,
      getVersion: getTimelineVersion,
      cacheMode: "timeline",
      adaptiveMaxCacheAge: true,
      maxCacheAge: 30 * minute,
      durationMinutes: 360,
      prefix: "timeline",
    })

    expect(adaptive.fetches).toBeLessThan(fixedFast.fetches)
    expect(adaptive.fetches).toBeGreaterThan(fixedMax.fetches)
    expect(adaptive.averageStaleLag).toBeLessThan(fixedMax.averageStaleLag)
    expect(adaptive.stalePolls).toBeLessThan(fixedMax.stalePolls)
    expect(adaptive.finalAdaptiveAge).toBeGreaterThanOrEqual(minute)
    expect(adaptive.finalAdaptiveAge).toBeLessThanOrEqual(30 * minute)
  })

  it("benchmarks hottest adaptive caching against fixed policies on jittery ranking data", async () => {
    const fixedFast = await runBenchmark({
      createSnapshot: createHottestSnapshot,
      getVersion: getHottestVersion,
      cacheMode: "hottest",
      adaptiveMaxCacheAge: false,
      maxCacheAge: minute,
      durationMinutes: 360,
      prefix: "hot",
    })
    const fixedMax = await runBenchmark({
      createSnapshot: createHottestSnapshot,
      getVersion: getHottestVersion,
      cacheMode: "hottest",
      adaptiveMaxCacheAge: false,
      maxCacheAge: 30 * minute,
      durationMinutes: 360,
      prefix: "hot",
    })
    const adaptive = await runBenchmark({
      createSnapshot: createHottestSnapshot,
      getVersion: getHottestVersion,
      cacheMode: "hottest",
      adaptiveMaxCacheAge: true,
      maxCacheAge: 30 * minute,
      durationMinutes: 360,
      prefix: "hot",
    })

    expect(adaptive.fetches).toBeLessThan(fixedFast.fetches)
    expect(adaptive.fetches).toBeGreaterThan(fixedMax.fetches)
    expect(adaptive.averageStaleLag).toBeLessThan(fixedMax.averageStaleLag)
    expect(adaptive.stalePolls).toBeLessThan(fixedMax.stalePolls)
    expect(adaptive.finalAdaptiveAge).toBeGreaterThanOrEqual(minute)
    expect(adaptive.finalAdaptiveAge).toBeLessThanOrEqual(30 * minute)
  })
})
