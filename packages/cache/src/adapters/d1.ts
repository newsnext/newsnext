import type { AdaptiveCacheState, CacheAdapter, CacheEntry } from "../typings"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/d1"
import * as schema from "./db/schema"

export class D1CacheAdapter implements CacheAdapter {
  private db

  constructor(d1: any) {
    this.db = drizzle(d1, { schema })
  }

  async get<T>(key: string): Promise<CacheEntry<T> | undefined> {
    try {
      const result = await this.db.query.cache.findFirst({
        where: eq(schema.cache.key, key),
      })
      if (!result) return undefined
      return {
        value: result.value as T,
        updatedAt: result.updatedAt,
      }
    } catch (e) {
      console.error("Cache read error:", e)
      return undefined
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    const now = Date.now()
    await this.db.insert(schema.cache).values({
      key,
      value: value as T,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: schema.cache.key,
      set: {
        value: value as T,
        updatedAt: now,
      },
    })
  }

  async getPolicy(key: string): Promise<AdaptiveCacheState | undefined> {
    try {
      const result = await this.db.query.cachePolicy.findFirst({
        where: eq(schema.cachePolicy.key, key),
      })
      if (!result) return undefined
      return {
        currentMaxCacheAge: result.currentMaxCacheAge,
        lastFingerprint: result.lastFingerprint ?? undefined,
        lastFetchedAt: result.lastFetchedAt,
        lastChangedAt: result.lastChangedAt ?? undefined,
        unchangedStreak: result.unchangedStreak,
        errorStreak: result.errorStreak,
        hourlyChangeScores: result.hourlyChangeScores,
        averageChangeScore: result.averageChangeScore,
      }
    } catch (e) {
      console.error("Cache policy read error:", e)
      return undefined
    }
  }

  async setPolicy(key: string, value: AdaptiveCacheState): Promise<void> {
    const now = Date.now()
    await this.db.insert(schema.cachePolicy).values({
      key,
      currentMaxCacheAge: value.currentMaxCacheAge,
      lastFingerprint: value.lastFingerprint,
      lastFetchedAt: value.lastFetchedAt,
      lastChangedAt: value.lastChangedAt,
      unchangedStreak: value.unchangedStreak,
      errorStreak: value.errorStreak,
      hourlyChangeScores: value.hourlyChangeScores,
      averageChangeScore: value.averageChangeScore,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: schema.cachePolicy.key,
      set: {
        currentMaxCacheAge: value.currentMaxCacheAge,
        lastFingerprint: value.lastFingerprint,
        lastFetchedAt: value.lastFetchedAt,
        lastChangedAt: value.lastChangedAt,
        unchangedStreak: value.unchangedStreak,
        errorStreak: value.errorStreak,
        hourlyChangeScores: value.hourlyChangeScores,
        averageChangeScore: value.averageChangeScore,
        updatedAt: now,
      },
    })
  }
}
