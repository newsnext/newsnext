import type { CacheAdapter, CacheEntry } from "./typings"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getCachedSource } from "./index"

class MemoryCacheAdapter implements CacheAdapter {
  entry?: CacheEntry<unknown>

  async get<T>(): Promise<CacheEntry<T> | undefined> {
    return this.entry as CacheEntry<T> | undefined
  }

  async set<T>(_key: string, value: T): Promise<void> {
    this.entry = {
      value,
      updatedAt: Date.now(),
    }
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
    adapter.entry = { value: ["cached"], updatedAt: 500 }
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
    adapter.entry = { value: ["cached"], updatedAt: 500 }
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
    adapter.entry = { value: ["cached"], updatedAt: 500 }
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
})
