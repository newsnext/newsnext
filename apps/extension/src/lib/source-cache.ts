import type { DBSchema, IDBPDatabase } from "idb"
import type { SourceLoadResult } from "./source-loader"
import { openDB } from "idb"

const SOURCE_CACHE_DATABASE_NAME = "newsnext-extension-source-cache"
const SOURCE_CACHE_DATABASE_VERSION = 3
const SOURCE_CACHE_STORE_NAME = "source-results"

interface SourceCacheEntry extends SourceLoadResult {
  cachedAt: number
  usedAt: number
}

interface SourceCacheDatabase extends DBSchema {
  [SOURCE_CACHE_STORE_NAME]: {
    key: string
    value: SourceCacheEntry
  }
}

let sourceCacheDatabasePromise: Promise<IDBPDatabase<SourceCacheDatabase>> | undefined

function openSourceCacheDatabase(): Promise<IDBPDatabase<SourceCacheDatabase>> {
  sourceCacheDatabasePromise ??= openDB<SourceCacheDatabase>(
    SOURCE_CACHE_DATABASE_NAME,
    SOURCE_CACHE_DATABASE_VERSION,
    {
      upgrade(database) {
        if (database.objectStoreNames.contains(SOURCE_CACHE_STORE_NAME)) {
          database.deleteObjectStore(SOURCE_CACHE_STORE_NAME)
        }

        database.createObjectStore(SOURCE_CACHE_STORE_NAME)
      },
    },
  )

  return sourceCacheDatabasePromise
}

export async function readCachedSource(
  cacheKey: string,
  maxAgeMs: number,
  now = Date.now(),
): Promise<SourceLoadResult | undefined> {
  try {
    const database = await openSourceCacheDatabase()

    const transaction = database.transaction(SOURCE_CACHE_STORE_NAME, "readwrite")
    const objectStore = transaction.objectStore(SOURCE_CACHE_STORE_NAME)
    const entry = await objectStore.get(cacheKey)
    if (!entry || now - entry.cachedAt >= maxAgeMs) {
      return undefined
    }

    await objectStore.put({
      ...entry,
      usedAt: now,
    }, cacheKey)
    await transaction.done

    const { cachedAt: _cachedAt, usedAt: _usedAt, ...result } = entry
    return result
  } catch {
    return undefined
  }
}

export async function writeCachedSource(
  cacheKey: string,
  result: SourceLoadResult,
  now = Date.now(),
): Promise<void> {
  try {
    const database = await openSourceCacheDatabase()

    await database.put(SOURCE_CACHE_STORE_NAME, {
      ...result,
      cachedAt: now,
      usedAt: now,
    }, cacheKey)
  } catch {
    // Cache writes should never block source loading.
  }
}
