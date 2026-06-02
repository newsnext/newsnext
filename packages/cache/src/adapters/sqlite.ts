import type { AdaptiveCacheState, CacheAdapter, CacheEntry } from "../typings"
import type { Database } from "db0"
import { fileURLToPath } from "node:url"
import { createDatabase } from "db0"
import { drizzle } from "db0/integrations/drizzle"
import { eq } from "drizzle-orm"
import * as schema from "./db/schema"

type Db0Database = Database
type SqliteDrizzleDatabase = ReturnType<typeof drizzle<typeof schema>>

export class SqliteCacheAdapter implements CacheAdapter {
  private readonly db

  private constructor(db: SqliteDrizzleDatabase) {
    this.db = db
  }

  static async create(path: string): Promise<SqliteCacheAdapter> {
    const db0 = await createDb0Database(path)
    await prepareSchema(db0)
    return new SqliteCacheAdapter(drizzle<typeof schema>(db0))
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

async function createDb0Database(path: string): Promise<Db0Database> {
  if (typeof Bun === "undefined") {
    throw new Error("SQLite cache requires Bun runtime")
  }

  const { default: createBunSqliteConnector } = await import("db0/connectors/bun-sqlite")
  return createDatabase(createBunSqliteConnector({ path: normalizeSqlitePath(path) }))
}

function normalizeSqlitePath(path: string): string {
  return path.startsWith("file:") ? fileURLToPath(path) : path
}

async function prepareSchema(db: Database): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS sources_cache_table (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt INTEGER NOT NULL
    );
  `)
  await db.exec(`
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
    );
  `)
}
