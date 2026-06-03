import type { AdaptiveCacheState, CacheAdapter, CacheEntry } from "../typings"

interface D1Statement {
  bind: (...values: unknown[]) => D1Statement
  first: <T = unknown>() => Promise<T | null>
  run: () => Promise<unknown>
}

interface D1DatabaseBinding {
  prepare: (query: string) => D1Statement
}

interface CacheRow {
  value: unknown
  updatedAt: number
}

interface CachePolicyRow {
  currentMaxCacheAge: number
  lastFingerprint: string | null
  lastFetchedAt: number
  lastChangedAt: number | null
  unchangedStreak: number
  errorStreak: number
  hourlyChangeScores: unknown
  averageChangeScore: number
}

export class D1CacheAdapter implements CacheAdapter {
  private readonly db: D1DatabaseBinding

  constructor(d1: unknown) {
    this.db = d1 as D1DatabaseBinding
  }

  async get<T>(key: string): Promise<CacheEntry<T> | undefined> {
    try {
      const result = await this.db
        .prepare("SELECT value, updatedAt FROM sources_cache_table WHERE key = ? LIMIT 1")
        .bind(key)
        .first<CacheRow>()
      if (!result) return undefined
      return {
        value: parseJsonValue<T>(result.value),
        updatedAt: result.updatedAt,
      }
    } catch (e) {
      console.error("Cache read error:", e)
      return undefined
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    const now = Date.now()
    await this.db
      .prepare(`
        INSERT INTO sources_cache_table (key, value, updatedAt)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updatedAt = excluded.updatedAt
      `)
      .bind(key, JSON.stringify(value), now)
      .run()
  }

  async getPolicy(key: string): Promise<AdaptiveCacheState | undefined> {
    try {
      const result = await this.db
        .prepare(`
          SELECT
            currentMaxCacheAge,
            lastFingerprint,
            lastFetchedAt,
            lastChangedAt,
            unchangedStreak,
            errorStreak,
            hourlyChangeScores,
            averageChangeScore
          FROM sources_cache_policy_table
          WHERE key = ?
          LIMIT 1
        `)
        .bind(key)
        .first<CachePolicyRow>()
      if (!result) return undefined
      return {
        currentMaxCacheAge: result.currentMaxCacheAge,
        lastFingerprint: result.lastFingerprint ?? undefined,
        lastFetchedAt: result.lastFetchedAt,
        lastChangedAt: result.lastChangedAt ?? undefined,
        unchangedStreak: result.unchangedStreak,
        errorStreak: result.errorStreak,
        hourlyChangeScores: parseJsonValue<number[]>(result.hourlyChangeScores),
        averageChangeScore: result.averageChangeScore,
      }
    } catch (e) {
      console.error("Cache policy read error:", e)
      return undefined
    }
  }

  async setPolicy(key: string, value: AdaptiveCacheState): Promise<void> {
    const now = Date.now()
    await this.db
      .prepare(`
        INSERT INTO sources_cache_policy_table (
          key,
          currentMaxCacheAge,
          lastFingerprint,
          lastFetchedAt,
          lastChangedAt,
          unchangedStreak,
          errorStreak,
          hourlyChangeScores,
          averageChangeScore,
          updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          currentMaxCacheAge = excluded.currentMaxCacheAge,
          lastFingerprint = excluded.lastFingerprint,
          lastFetchedAt = excluded.lastFetchedAt,
          lastChangedAt = excluded.lastChangedAt,
          unchangedStreak = excluded.unchangedStreak,
          errorStreak = excluded.errorStreak,
          hourlyChangeScores = excluded.hourlyChangeScores,
          averageChangeScore = excluded.averageChangeScore,
          updatedAt = excluded.updatedAt
      `)
      .bind(
        key,
        value.currentMaxCacheAge,
        value.lastFingerprint,
        value.lastFetchedAt,
        value.lastChangedAt,
        value.unchangedStreak,
        value.errorStreak,
        JSON.stringify(value.hourlyChangeScores),
        value.averageChangeScore,
        now,
      )
      .run()
  }
}

function parseJsonValue<T>(value: unknown): T {
  return typeof value === "string" ? JSON.parse(value) as T : value as T
}
