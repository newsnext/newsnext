import type { AdaptiveCacheState, CacheAdapter, CacheEntry } from "../typings"
import type { Database } from "db0"
import { drizzle } from "db0/integrations/drizzle"
import { eq } from "drizzle-orm"
import * as schema from "./db/schema"

type Db0Database = Database
type SqliteDrizzleDatabase = ReturnType<typeof drizzle<typeof schema>>

export class Db0CacheAdapter implements CacheAdapter {
  private readonly db

  private constructor(db: SqliteDrizzleDatabase) {
    this.db = db
  }

  static async fromDb0(db0: Db0Database): Promise<Db0CacheAdapter> {
    await prepareSchema(db0)
    return new Db0CacheAdapter(drizzle<typeof schema>(db0))
  }

  async get<T>(key: string): Promise<CacheEntry<T> | undefined> {
    try {
      const result = await this.db.select().from(schema.cache).where(eq(schema.cache.key, key)).get()
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
      const result = await this.db.select().from(schema.cachePolicy).where(eq(schema.cachePolicy.key, key)).get()
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

function parseJsonValue<T>(value: unknown): T {
  return typeof value === "string" ? JSON.parse(value) as T : value as T
}

async function prepareSchema(db: Database): Promise<void> {
  const statements = [
    `
    CREATE TABLE IF NOT EXISTS sources_cache_table (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `,
    `
    CREATE TABLE IF NOT EXISTS sources_cache_policy_table (
      key TEXT PRIMARY KEY,
      currentMaxCacheAge INTEGER NOT NULL,
      lastFingerprint TEXT,
      lastFetchedAt INTEGER NOT NULL,
      lastChangedAt INTEGER,
      unchangedStreak INTEGER NOT NULL,
      errorStreak INTEGER NOT NULL,
      hourlyChangeScores TEXT NOT NULL,
      averageChangeScore REAL NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `,
  ]

  for (const statement of statements) {
    await db.prepare(statement).run()
  }
}
