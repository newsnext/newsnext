import type { SourceLoadResult } from "./load-result"
import Dexie from "dexie"
import { getSourceQueryHash } from "./query-target"

const PERSISTED_SOURCE_RESULTS_DATABASE_NAME = "newsnext-extension-source-cache"
const SOURCE_RESULT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

interface PersistedSourceTarget {
  params: Record<string, unknown>
  sourceId: string
  version: number
}

interface PersistedSourceResult {
  fetchedAt: number
  key: string
  result: SourceLoadResult
}

class SourceResultDatabase extends Dexie {
  sourceResults!: Dexie.Table<PersistedSourceResult, string>

  constructor() {
    super(PERSISTED_SOURCE_RESULTS_DATABASE_NAME)
    this.version(8).stores({
      sourceResults: "key, fetchedAt",
    })
  }
}

const database = new SourceResultDatabase()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isValidPersistedSourceResult(
  value: unknown,
  target: PersistedSourceTarget,
  key: string,
): value is PersistedSourceResult {
  if (!isRecord(value) || !isRecord(value.result)) {
    return false
  }
  const { fetchedAt, result } = value
  const source = result.source
  if (
    typeof fetchedAt !== "number"
    || !Number.isFinite(fetchedAt)
    || fetchedAt <= 0
    || value.key !== key
    || !Array.isArray(result.items)
    || !isRecord(source)
    || source.id !== target.sourceId
    || source.version !== target.version
  ) {
    return false
  }
  return true
}

function isExpired(result: PersistedSourceResult, now = Date.now()): boolean {
  return now - result.fetchedAt > SOURCE_RESULT_MAX_AGE_MS
}

export async function readPersistedSourceResult(
  target: PersistedSourceTarget,
): Promise<PersistedSourceResult | undefined> {
  try {
    const key = getSourceQueryHash(target)
    const value: unknown = await database.sourceResults.get(key)
    if (!isValidPersistedSourceResult(value, target, key) || isExpired(value)) {
      if (value !== undefined) await database.sourceResults.delete(key)
      return undefined
    }
    return value
  } catch (error) {
    console.error("Failed to read persisted Source result", error)
    return undefined
  }
}

export async function writePersistedSourceResult(
  target: PersistedSourceTarget,
  result: SourceLoadResult,
  fetchedAt: number,
): Promise<void> {
  try {
    await database.sourceResults.put({
      fetchedAt,
      key: getSourceQueryHash(target),
      result,
    })
  } catch (error) {
    console.error("Failed to persist Source result", error)
  }
}

export async function clearPersistedSourceResults(): Promise<void> {
  try {
    await database.sourceResults.clear()
  } catch {
    // Result cleanup should not prevent the remaining user data from being cleared.
  }
}
