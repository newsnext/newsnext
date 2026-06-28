import type { LocalSourceLoadResult } from "./local-source-loader"

const SOURCE_CACHE_DATABASE_NAME = "newsnext-extension-source-cache"
const SOURCE_CACHE_DATABASE_VERSION = 1
const SOURCE_CACHE_STORE_NAME = "source-results"

export interface LocalSourceCacheEntry extends LocalSourceLoadResult {
  cachedAt: number
}

function getIndexedDB(): IDBFactory | undefined {
  return globalThis.indexedDB
}

function openSourceCacheDatabase(): Promise<IDBDatabase | undefined> {
  const indexedDB = getIndexedDB()

  if (!indexedDB) {
    return Promise.resolve(undefined)
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SOURCE_CACHE_DATABASE_NAME, SOURCE_CACHE_DATABASE_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(SOURCE_CACHE_STORE_NAME)) {
        database.createObjectStore(SOURCE_CACHE_STORE_NAME, { keyPath: "key" })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("Failed to open source cache"))
    request.onblocked = () => reject(new Error("Source cache database upgrade is blocked"))
  })
}

function closeDatabaseAfterTransaction(database: IDBDatabase, transaction: IDBTransaction): void {
  transaction.oncomplete = () => database.close()
  transaction.onabort = () => database.close()
  transaction.onerror = () => database.close()
}

export async function readCachedLocalSource(
  key: string,
  maxAgeMs: number,
  now = Date.now(),
): Promise<LocalSourceLoadResult | undefined> {
  try {
    const database = await openSourceCacheDatabase()
    if (!database) {
      return undefined
    }

    return await new Promise((resolve) => {
      const transaction = database.transaction(SOURCE_CACHE_STORE_NAME, "readonly")
      closeDatabaseAfterTransaction(database, transaction)

      const request = transaction.objectStore(SOURCE_CACHE_STORE_NAME).get(key)
      request.onsuccess = () => {
        const entry = request.result as LocalSourceCacheEntry | undefined
        if (!entry || now - entry.cachedAt >= maxAgeMs) {
          resolve(undefined)
          return
        }

        const { cachedAt: _cachedAt, ...result } = entry
        resolve(result)
      }
      request.onerror = () => resolve(undefined)
    })
  } catch {
    return undefined
  }
}

export async function writeCachedLocalSource(
  result: LocalSourceLoadResult,
  now = Date.now(),
): Promise<void> {
  try {
    const database = await openSourceCacheDatabase()
    if (!database) {
      return
    }

    await new Promise<void>((resolve) => {
      const transaction = database.transaction(SOURCE_CACHE_STORE_NAME, "readwrite")
      closeDatabaseAfterTransaction(database, transaction)

      transaction.oncomplete = () => {
        database.close()
        resolve()
      }
      transaction.onabort = () => {
        database.close()
        resolve()
      }
      transaction.onerror = () => {
        database.close()
        resolve()
      }

      transaction.objectStore(SOURCE_CACHE_STORE_NAME).put({
        ...result,
        cachedAt: now,
      } satisfies LocalSourceCacheEntry)
    })
  } catch {
    // Cache writes should never block source loading.
  }
}
