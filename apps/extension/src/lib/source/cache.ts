import type { Table } from "dexie"
import type { SourceLoadResult } from "./loader"
import Dexie from "dexie"
import { selectSourceCacheKeysToDelete } from "./cache-values"

const SOURCE_CACHE_DATABASE_NAME = "newsnext-extension-source-cache"
const SOURCE_CACHE_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000
const CACHE_CLEANUP_KEY = "cleanup"

interface SourceCacheRecord extends SourceLoadResult {
  cacheKey: string
  usedAt: number
}

interface SourceCacheMetadataRecord {
  key: string
  value: number
}

interface SourceCacheReadResult {
  isFresh: boolean
  result: SourceLoadResult
}

class SourceCacheDatabase extends Dexie {
  metadata!: Table<SourceCacheMetadataRecord, string>
  sourceResults!: Table<SourceCacheRecord, string>

  constructor() {
    super(SOURCE_CACHE_DATABASE_NAME)
    this.version(1).stores({
      metadata: "key",
      sourceResults: "cacheKey",
    })
  }
}

const database = new SourceCacheDatabase()
let cleanupPromise: Promise<void> | undefined

export async function readSourceCache(
  cacheKey: string,
  maxAgeMs: number,
  now = Date.now(),
): Promise<SourceCacheReadResult | undefined> {
  try {
    const entry = await database.transaction(
      "rw",
      database.sourceResults,
      async (transaction) => {
        const sourceResults = transaction.table<SourceCacheRecord, string>("sourceResults")
        const cached = await sourceResults.get(cacheKey)
        if (cached) await sourceResults.update(cacheKey, { usedAt: now })
        return cached
      },
    )
    if (!entry) return
    const { cacheKey: _cacheKey, usedAt: _usedAt, ...result } = entry
    return {
      isFresh: now - result.updatedAt < maxAgeMs,
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
    await database.sourceResults.put({
      ...result,
      cacheKey,
      usedAt: now,
    })
    void scheduleSourceCacheCleanup(now).catch(() => undefined)
  } catch {
    // Cache writes should never block source loading.
  }
}

export async function clearSourceCache(): Promise<void> {
  try {
    await cleanupPromise?.catch(() => undefined)
    await database.transaction(
      "rw",
      [database.metadata, database.sourceResults],
      async (transaction) => {
        const metadata = transaction.table<SourceCacheMetadataRecord, string>("metadata")
        const sourceResults = transaction.table<SourceCacheRecord, string>("sourceResults")
        await Promise.all([
          sourceResults.clear(),
          metadata.put({ key: CACHE_CLEANUP_KEY, value: 0 }),
        ])
      },
    )
  } catch {
    // Cache cleanup should not prevent the remaining user data from being cleared.
  }
}

function scheduleSourceCacheCleanup(now: number): Promise<void> {
  if (cleanupPromise) return cleanupPromise
  cleanupPromise = runScheduledSourceCacheCleanup(now)
    .finally(() => {
      cleanupPromise = undefined
    })
  return cleanupPromise
}

async function runScheduledSourceCacheCleanup(now: number): Promise<void> {
  const lastCleanupAt = (await database.metadata.get(CACHE_CLEANUP_KEY))?.value
  if (lastCleanupAt !== undefined && now - lastCleanupAt < SOURCE_CACHE_CLEANUP_INTERVAL_MS) return
  await database.transaction(
    "rw",
    [database.metadata, database.sourceResults],
    async (transaction) => {
      const metadata = transaction.table<SourceCacheMetadataRecord, string>("metadata")
      const sourceResults = transaction.table<SourceCacheRecord, string>("sourceResults")
      const entries = await sourceResults.toArray()
      const textEncoder = new TextEncoder()
      const cacheEntries = entries.map(entry => ({
        key: entry.cacheKey,
        size: textEncoder.encode(JSON.stringify(entry)).byteLength,
        usedAt: entry.usedAt,
      }))
      await sourceResults.bulkDelete(selectSourceCacheKeysToDelete(cacheEntries, now))
      await metadata.put({ key: CACHE_CLEANUP_KEY, value: now })
    },
  )
}
