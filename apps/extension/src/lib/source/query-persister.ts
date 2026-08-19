import type { AsyncStorage } from "@tanstack/query-persist-client-core"
import type { QueryClient } from "@tanstack/react-query"
import { experimental_createQueryPersister } from "@tanstack/query-persist-client-core"
import Dexie from "dexie"
import { SOURCE_QUERY_KEY } from "./query-target"

const SOURCE_QUERY_CACHE_DATABASE_NAME = "newsnext-extension-source-cache"
const SOURCE_QUERY_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
const SOURCE_QUERY_CACHE_PREFIX = "source-query"

interface QueryCacheRecord {
  key: string
  value: string
}

class SourceQueryCacheDatabase extends Dexie {
  queryCache!: Dexie.Table<QueryCacheRecord, string>

  constructor() {
    super(SOURCE_QUERY_CACHE_DATABASE_NAME)
    this.version(1).stores({
      metadata: "key",
      sourceResults: "cacheKey",
    })
    this.version(2).stores({
      metadata: null,
      queryCache: "key",
      sourceResults: null,
    })
  }
}

const database = new SourceQueryCacheDatabase()
const restorationPromises = new WeakMap<QueryClient, Promise<void>>()

const storage: AsyncStorage = {
  async entries() {
    const records = await database.queryCache.toArray()
    return records.map(record => [record.key, record.value])
  },
  async getItem(key) {
    return (await database.queryCache.get(key))?.value
  },
  async removeItem(key) {
    await database.queryCache.delete(key)
  },
  async setItem(key, value) {
    await database.queryCache.put({ key, value })
  },
}

export const sourceQueryPersister = experimental_createQueryPersister({
  maxAge: SOURCE_QUERY_CACHE_MAX_AGE_MS,
  prefix: SOURCE_QUERY_CACHE_PREFIX,
  storage,
})

export function restorePersistedSourceQueries(
  queryClient: QueryClient,
): Promise<void> {
  const activeRestoration = restorationPromises.get(queryClient)
  if (activeRestoration) return activeRestoration

  const restoration = sourceQueryPersister.restoreQueries(queryClient, {
    queryKey: SOURCE_QUERY_KEY,
  }).catch((error) => {
    console.error("Failed to restore persisted Source queries", error)
  }).finally(() => {
    restorationPromises.delete(queryClient)
  })
  restorationPromises.set(queryClient, restoration)
  return restoration
}

export async function clearPersistedSourceQueries(): Promise<void> {
  try {
    await sourceQueryPersister.removeQueries({ queryKey: SOURCE_QUERY_KEY })
  } catch {
    // Cache cleanup should not prevent the remaining user data from being cleared.
  }
}
