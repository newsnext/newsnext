import type { CacheAdapter, CacheEntry } from "../typings"
import { Database } from "bun:sqlite"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/bun-sqlite"
import * as schema from "./db/schema"

export class SqliteCacheAdapter implements CacheAdapter {
  private db

  constructor(path: string) {
    const sqlite = new Database(path, { create: true })
    this.db = drizzle(sqlite, { schema })
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
}
