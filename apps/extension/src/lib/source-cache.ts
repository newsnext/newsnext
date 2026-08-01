import type { DBSchema, IDBPDatabase } from "idb"
import type { SourceLoadResult } from "./source-loader"
import { openDB } from "idb"
import { selectSourceCacheKeysToDelete } from "./source-cache-values"

const SOURCE_CACHE_DATABASE_NAME = "newsnext-extension-source-cache"
const SOURCE_CACHE_DATABASE_VERSION = 3
const SOURCE_CACHE_STORE_NAME = "source-results"

interface SourceCacheEntry extends SourceLoadResult {
  cachedAt: number
  usedAt: number
}

export interface SourceCacheReadResult {
  cachedAt: number
  isFresh: boolean
  result: SourceLoadResult
}

interface SourceCacheDatabase extends DBSchema {
  [SOURCE_CACHE_STORE_NAME]: {
    key: string
    value: SourceCacheEntry
  }
}

let sourceCacheDatabasePromise: Promise<IDBPDatabase<SourceCacheDatabase>> | undefined
let sourceCacheCleanupPromise: Promise<void> | undefined
let lastSourceCacheCleanupAt: number | undefined
const SOURCE_CACHE_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000

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

export async function readSourceCache(
  cacheKey: string,
  maxAgeMs: number,
  now = Date.now(),
): Promise<SourceCacheReadResult | undefined> {
  try {
    const database = await openSourceCacheDatabase()

    const transaction = database.transaction(SOURCE_CACHE_STORE_NAME, "readwrite")
    const objectStore = transaction.objectStore(SOURCE_CACHE_STORE_NAME)
    const entry = await objectStore.get(cacheKey)
    if (!entry) {
      return undefined
    }

    await objectStore.put({
      ...entry,
      usedAt: now,
    }, cacheKey)
    await transaction.done

    const { cachedAt, usedAt: _usedAt, ...result } = entry
    return {
      cachedAt,
      isFresh: now - cachedAt < maxAgeMs,
      result,
    }
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
    void scheduleSourceCacheCleanup(database, now).catch(() => undefined)
  } catch {
    // Cache writes should never block source loading.
  }
}

function scheduleSourceCacheCleanup(
  database: IDBPDatabase<SourceCacheDatabase>,
  now: number,
): Promise<void> {
  if (sourceCacheCleanupPromise) {
    return sourceCacheCleanupPromise
  }
  if (
    lastSourceCacheCleanupAt !== undefined
    && now - lastSourceCacheCleanupAt < SOURCE_CACHE_CLEANUP_INTERVAL_MS
  ) {
    return Promise.resolve()
  }

  sourceCacheCleanupPromise = cleanupSourceCache(database, now)
    .then(() => {
      lastSourceCacheCleanupAt = now
    })
    .finally(() => {
      sourceCacheCleanupPromise = undefined
    })
  return sourceCacheCleanupPromise
}

async function cleanupSourceCache(
  database: IDBPDatabase<SourceCacheDatabase>,
  now: number,
): Promise<void> {
  const transaction = database.transaction(SOURCE_CACHE_STORE_NAME, "readwrite")
  const objectStore = transaction.objectStore(SOURCE_CACHE_STORE_NAME)
  const [keys, entries] = await Promise.all([
    objectStore.getAllKeys(),
    objectStore.getAll(),
  ])
  const textEncoder = new TextEncoder()
  const cacheEntries = entries.flatMap((entry, index) => {
    const key = keys[index]
    return typeof key === "string"
      ? [{
          key,
          size: textEncoder.encode(JSON.stringify(entry)).byteLength,
          usedAt: entry.usedAt,
        }]
      : []
  })

  await Promise.all(
    selectSourceCacheKeysToDelete(cacheEntries, now)
      .map(key => objectStore.delete(key)),
  )
  await transaction.done
}
