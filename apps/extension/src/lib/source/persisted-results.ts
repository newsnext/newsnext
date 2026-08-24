import type { QueryClient } from "@tanstack/react-query"
import type { SourceLoadResponse, SourceLoadResult } from "./load-result"
import type { SourceQueryTarget } from "./query-target"
import Dexie from "dexie"
import { getSourceQueryHash, getSourceQueryKey } from "./query-target"

const PERSISTED_SOURCE_RESULTS_DATABASE_NAME = "newsnext-extension-source-cache"
const SOURCE_RESULT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

interface PersistedSourceResult {
  fetchedAt: number
  key: string
  result: SourceLoadResult
  target: SourceQueryTarget
}

class SourceResultDatabase extends Dexie {
  sourceResults!: Dexie.Table<PersistedSourceResult, string>

  constructor() {
    super(PERSISTED_SOURCE_RESULTS_DATABASE_NAME)
    this.version(6).stores({
      sourceResults: "key, fetchedAt",
    })
  }
}

const database = new SourceResultDatabase()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isValidPersistedSourceResult(value: unknown): value is PersistedSourceResult {
  if (!isRecord(value) || !isRecord(value.target) || !isRecord(value.result)) {
    return false
  }
  const { fetchedAt, key, result, target } = value
  const source = result.source
  if (
    typeof fetchedAt !== "number"
    || !Number.isFinite(fetchedAt)
    || fetchedAt <= 0
    || typeof key !== "string"
    || typeof target.sourceId !== "string"
    || typeof target.version !== "number"
    || !Number.isInteger(target.version)
    || target.version <= 0
    || !isRecord(target.params)
    || (target.instanceId !== undefined
      && (typeof target.instanceId !== "string" || target.instanceId.length === 0))
    || target.remote !== undefined
    || !Array.isArray(result.items)
    || !isRecord(source)
    || source.id !== target.sourceId
    || source.version !== target.version
  ) {
    return false
  }
  return key === getSourceQueryHash({
    ...(typeof target.instanceId === "string" ? { instanceId: target.instanceId } : {}),
    params: target.params,
    sourceId: target.sourceId,
    version: target.version,
  })
}

function isExpired(result: PersistedSourceResult, now = Date.now()): boolean {
  return now - result.fetchedAt > SOURCE_RESULT_MAX_AGE_MS
}

export async function readPersistedSourceResult(
  target: SourceQueryTarget,
): Promise<PersistedSourceResult | undefined> {
  try {
    const key = getSourceQueryHash(target)
    const value: unknown = await database.sourceResults.get(key)
    if (!isValidPersistedSourceResult(value) || isExpired(value)) {
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
  target: SourceQueryTarget,
  result: SourceLoadResult,
  fetchedAt: number,
): Promise<void> {
  try {
    await database.sourceResults.put({
      fetchedAt,
      key: getSourceQueryHash(target),
      result,
      target,
    })
  } catch (error) {
    console.error("Failed to persist Source result", error)
  }
}

export async function restorePersistedSourceResults(
  queryClient: QueryClient,
): Promise<void> {
  try {
    const values: unknown[] = await database.sourceResults.toArray()
    const invalidKeys: string[] = []
    for (const value of values) {
      if (!isValidPersistedSourceResult(value) || isExpired(value)) {
        if (isRecord(value) && typeof value.key === "string") invalidKeys.push(value.key)
        continue
      }
      queryClient.setQueryData(
        getSourceQueryKey(value.target),
        {
          fetchProtected: true,
          fetchedAt: value.fetchedAt,
          loadedAt: Date.now(),
          params: value.target.params,
          result: value.result,
        } satisfies SourceLoadResponse,
        { updatedAt: value.fetchedAt },
      )
    }
    if (invalidKeys.length > 0) {
      await database.sourceResults.bulkDelete(invalidKeys)
    }
  } catch (error) {
    console.error("Failed to restore persisted Source results", error)
  }
}

export async function clearPersistedSourceResults(): Promise<void> {
  try {
    await database.sourceResults.clear()
  } catch {
    // Result cleanup should not prevent the remaining user data from being cleared.
  }
}
