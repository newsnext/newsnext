import { describe, expect, it } from "vitest"
import { D1CacheAdapter } from "./d1"

interface StoredTable {
  cache: Map<string, { value: string, updatedAt: number }>
  policy: Map<string, {
    currentMaxCacheAge: number
    lastFingerprint: string | null
    lastFetchedAt: number
    lastChangedAt: number | null
    unchangedStreak: number
    errorStreak: number
    hourlyChangeScores: string
    averageChangeScore: number
    updatedAt: number
  }>
}

class MockD1Statement {
  private values: unknown[] = []

  constructor(
    private readonly tables: StoredTable,
    private readonly query: string,
  ) {}

  bind(...values: unknown[]): MockD1Statement {
    this.values = values
    return this
  }

  async first<T>(): Promise<T | null> {
    const key = this.values[0] as string

    if (this.query.includes("sources_cache_policy_table")) {
      return this.tables.policy.get(key) as T | undefined ?? null
    }

    return this.tables.cache.get(key) as T | undefined ?? null
  }

  async run(): Promise<void> {
    const key = this.values[0] as string

    if (this.query.includes("sources_cache_policy_table")) {
      this.tables.policy.set(key, {
        currentMaxCacheAge: this.values[1] as number,
        lastFingerprint: this.values[2] as string | null,
        lastFetchedAt: this.values[3] as number,
        lastChangedAt: this.values[4] as number | null,
        unchangedStreak: this.values[5] as number,
        errorStreak: this.values[6] as number,
        hourlyChangeScores: this.values[7] as string,
        averageChangeScore: this.values[8] as number,
        updatedAt: this.values[9] as number,
      })
      return
    }

    this.tables.cache.set(key, {
      value: this.values[1] as string,
      updatedAt: this.values[2] as number,
    })
  }
}

class MockD1Database {
  readonly tables: StoredTable = {
    cache: new Map(),
    policy: new Map(),
  }

  prepare(query: string): MockD1Statement {
    return new MockD1Statement(this.tables, query)
  }
}

describe("d1 cache adapter", () => {
  it("stores cache entries without a Drizzle runtime dependency", async () => {
    const adapter = new D1CacheAdapter(new MockD1Database())

    await adapter.set("source", [{ title: "Hello" }])

    await expect(adapter.get("source")).resolves.toMatchObject({
      value: [{ title: "Hello" }],
    })
  })

  it("stores adaptive cache policies", async () => {
    const adapter = new D1CacheAdapter(new MockD1Database())

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

    await expect(adapter.getPolicy("source")).resolves.toEqual({
      currentMaxCacheAge: 60_000,
      lastFingerprint: "abc",
      lastFetchedAt: 100,
      lastChangedAt: 50,
      unchangedStreak: 2,
      errorStreak: 1,
      hourlyChangeScores: [0.1, 0.8],
      averageChangeScore: 0.45,
    })
  })
})
