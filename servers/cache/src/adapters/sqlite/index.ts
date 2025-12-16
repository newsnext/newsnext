import type { CacheAdapter, CacheEntry } from "../../typings"
import { eq } from "drizzle-orm"
import { cache, db } from "./db"

export class SqliteCacheAdapter implements CacheAdapter {
  async get<T>(key: string): Promise<CacheEntry<T> | undefined> {
    try {
      const result = await db.query.cache.findFirst({
        where: eq(cache.key, key),
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
    await db.insert(cache).values({
      key,
      value: value as T,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: cache.key,
      set: {
        value: value as T,
        updatedAt: now,
      },
    })
  }
}
