import type { DBSchema, IDBPDatabase } from "idb"
import type { ClientSourceLoadResult } from "./client-source-loader"
import { openDB } from "idb"

const SOURCE_CACHE_DATABASE_NAME = "newsnext-extension-source-cache"
const SOURCE_CACHE_DATABASE_VERSION = 2
const SOURCE_CACHE_STORE_NAME = "source-results"

export type ClientSourceCacheValue = Omit<ClientSourceLoadResult, "key">

export interface ClientSourceCacheEntry extends ClientSourceCacheValue {
  cachedAt: number
  usedAt: number
}

interface SourceCacheDatabase extends DBSchema {
  [SOURCE_CACHE_STORE_NAME]: {
    key: string
    value: ClientSourceCacheEntry
  }
}

let sourceCacheDatabasePromise: Promise<IDBPDatabase<SourceCacheDatabase> | undefined> | undefined

function getIndexedDB(): IDBFactory | undefined {
  return globalThis.indexedDB
}

function openSourceCacheDatabase(): Promise<IDBPDatabase<SourceCacheDatabase> | undefined> {
  const indexedDB = getIndexedDB()

  if (!indexedDB) {
    return Promise.resolve(undefined)
  }

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

export async function readCachedClientSource(
  key: string,
  maxAgeMs: number,
  now = Date.now(),
): Promise<ClientSourceLoadResult | undefined> {
  try {
    const database = await openSourceCacheDatabase()
    if (!database) {
      return undefined
    }

    const transaction = database.transaction(SOURCE_CACHE_STORE_NAME, "readwrite")
    const objectStore = transaction.objectStore(SOURCE_CACHE_STORE_NAME)
    const entry = await objectStore.get(key)
    if (!entry || now - entry.cachedAt >= maxAgeMs) {
      return undefined
    }

    await objectStore.put({
      ...entry,
      usedAt: now,
    }, key)
    await transaction.done

    const { cachedAt: _cachedAt, usedAt: _usedAt, ...result } = entry
    return {
      ...result,
      key,
    }
  } catch {
    return undefined
  }
}

export async function writeCachedClientSource(
  result: ClientSourceLoadResult,
  now = Date.now(),
): Promise<void> {
  try {
    const database = await openSourceCacheDatabase()
    if (!database) {
      return
    }

    const { key, ...value } = result

    await database.put(SOURCE_CACHE_STORE_NAME, {
      ...value,
      cachedAt: now,
      usedAt: now,
    }, key)
  } catch {
    // Cache writes should never block source loading.
  }
}
