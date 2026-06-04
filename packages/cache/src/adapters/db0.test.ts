import type { AdaptiveCacheState } from "@newsnext/cache-policy"
import type { CacheAdapter, CacheEntry } from "../typings"
import { describe, expect, it } from "vitest"
import { Db0CacheAdapter } from "./db0"

class FakeCacheStorage implements CacheAdapter {
  readonly entries = new Map<string, CacheEntry<unknown>>()
  readonly policies = new Map<string, AdaptiveCacheState>()

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

describe("db0 cache adapter", () => {
  it("delegates cache entry and policy operations to storage", async () => {
    const storage = new FakeCacheStorage()
    const adapter = new Db0CacheAdapter(storage)

    await adapter.set("source", [{ title: "Hello" }])
    await expect(adapter.get("source")).resolves.toMatchObject({
      value: [{ title: "Hello" }],
    })

    await adapter.setPolicy("source", {
      currentMaxCacheAge: 60_000,
      lastFingerprint: "abc",
      lastFetchedAt: 100,
      lastChangedAt: 50,
      unchangedStreak: 2,
      errorStreak: 1,
      hourlyChangeScores: [0.1, 0.8],
      averageChangeScore: 0.45,
    })

    await expect(adapter.getPolicy("source")).resolves.toMatchObject({
      currentMaxCacheAge: 60_000,
      lastFingerprint: "abc",
    })
  })
})
