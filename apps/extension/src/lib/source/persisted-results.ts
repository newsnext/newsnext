import type { QueryClient } from "@tanstack/react-query"
import type { Instance } from "./live-cards"
import type { LoadedSourceDescriptor, SourceLoadResponse, SourceLoadResult } from "./load-result"
import type { SourceQueryTarget } from "./query-target"
import Dexie from "dexie"
import { createSourceQueryTarget, getSourceQueryHash, getSourceQueryKey } from "./query-target"

const PERSISTED_SOURCE_RESULTS_DATABASE_NAME = "newsnext-extension-source-cache"
const SOURCE_RESULT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

type PersistedSourceTarget = Pick<
  SourceQueryTarget,
  "params" | "sourceId" | "version"
>

interface PersistedSourceResult {
  fetchedAt: number
  key: string
  result: SourceLoadResult
  target: PersistedSourceTarget
}

class SourceResultDatabase extends Dexie {
  sourceResults!: Dexie.Table<PersistedSourceResult, string>

  constructor() {
    super(PERSISTED_SOURCE_RESULTS_DATABASE_NAME)
    this.version(6).stores({
      sourceResults: "key, fetchedAt",
    })
    this.version(7).stores({
      sourceResults: "key, fetchedAt, target.sourceId",
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
    || target.instanceId !== undefined
    || target.remote !== undefined
    || !Array.isArray(result.items)
    || !isRecord(source)
    || source.id !== target.sourceId
    || source.version !== target.version
  ) {
    return false
  }
  return key === getSourceQueryHash({
    params: target.params,
    sourceId: target.sourceId,
    version: target.version,
  })
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
  target: PersistedSourceTarget,
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
  instances: readonly Pick<Instance, "patch" | "sourceId">[],
  sources: readonly LoadedSourceDescriptor[],
): Promise<void> {
  try {
    const sourceIds = [...new Set(instances.map(instance => instance.sourceId))]
    if (sourceIds.length === 0) return

    const values: unknown[] = await database.sourceResults
      .where("target.sourceId")
      .anyOf(sourceIds)
      .toArray()
    const invalidKeys: string[] = []
    const records = values.flatMap((value) => {
      if (!isValidPersistedSourceResult(value) || isExpired(value)) {
        if (isRecord(value) && typeof value.key === "string") invalidKeys.push(value.key)
        return []
      }
      return [value]
    })
    const sourcesById = new Map(sources.map(source => [source.id, source]))
    const referencedKeys = new Set<string>()
    for (const instance of instances) {
      const currentSource = sourcesById.get(instance.sourceId)
      if (currentSource) {
        referencedKeys.add(getSourceQueryHash(createSourceQueryTarget(
          instance.sourceId,
          currentSource,
          instance.patch.params,
        )))
        continue
      }
      const fallback = records
        .filter(record => (
          record.target.sourceId === instance.sourceId
          && getSourceQueryHash(createSourceQueryTarget(
            instance.sourceId,
            record.result.source,
            instance.patch.params,
          )) === record.key
        ))
        .sort((left, right) => right.fetchedAt - left.fetchedAt)[0]
      if (fallback) referencedKeys.add(fallback.key)
    }

    for (const value of records) {
      if (!referencedKeys.has(value.key)) continue
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
