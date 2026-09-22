import type { SourceLoaderResult } from "@newsnext/source-kit/types"
import type { SourceLoadResponse, SourceLoadResult } from "./load-result"
import Dexie from "dexie"
import { getSourceQueryHash } from "./query-target"

const SOURCE_SNAPSHOT_DATABASE_NAME = "newsnext-extension-source-snapshot"
const SOURCE_SNAPSHOT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

export interface SourceSnapshotTarget {
  params: Record<string, unknown>
  sourceId: string
  version: number
}

interface SourceResultSnapshot {
  fetchedAt: number
  key: string
  result: SourceLoaderResult
}

interface LiveCardSnapshot {
  cardId: string
  fetchedAt: number
  // Kept in the lightweight card record so presentation reads do not load items.
  metadata: SourceLoaderResult["metadata"]
  params: Record<string, unknown>
  resultKey: string
  source: SourceLoadResult["source"]
}

class SourceSnapshotDatabase extends Dexie {
  liveCardSnapshots!: Dexie.Table<LiveCardSnapshot, string>
  sourceResultSnapshots!: Dexie.Table<SourceResultSnapshot, string>

  constructor() {
    super(SOURCE_SNAPSHOT_DATABASE_NAME)
    this.version(8).stores({
      sourceSnapshots: "key, fetchedAt",
    })
    this.version(9).stores({
      sourceSnapshots: null,
      liveCardSnapshots: "cardId, fetchedAt, resultKey",
      sourceResultSnapshots: "key, fetchedAt",
    })
  }
}

const database = new SourceSnapshotDatabase()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isValidInlinePresentation(value: unknown, itemCount: number): boolean {
  if (value === undefined) return true
  return Array.isArray(value)
    && value.length === itemCount
    && value.every(entry => typeof entry === "string")
}

function isExpired(fetchedAt: number, now = Date.now()): boolean {
  return now - fetchedAt > SOURCE_SNAPSHOT_MAX_AGE_MS
}

function isValidSourceResultSnapshot(
  value: unknown,
  key: string,
): value is SourceResultSnapshot {
  if (!isRecord(value) || !isRecord(value.result)) return false
  return value.key === key
    && typeof value.fetchedAt === "number"
    && Number.isFinite(value.fetchedAt)
    && value.fetchedAt > 0
    && Array.isArray(value.result.items)
    && isValidInlinePresentation(value.result.inlinePresentation, value.result.items.length)
}

function isValidLiveCardSnapshot(
  value: unknown,
  cardId: string,
): value is LiveCardSnapshot {
  return isRecord(value)
    && value.cardId === cardId
    && typeof value.fetchedAt === "number"
    && Number.isFinite(value.fetchedAt)
    && value.fetchedAt > 0
    && typeof value.resultKey === "string"
    && isRecord(value.params)
    && isRecord(value.source)
    && typeof value.source.id === "string"
    && typeof value.source.version === "number"
}

function getSourceResultKey(target: SourceSnapshotTarget): string {
  return getSourceQueryHash(target)
}

export async function readSourceResultSnapshot(
  target: SourceSnapshotTarget,
): Promise<SourceResultSnapshot | undefined> {
  return readSourceResultSnapshotByKey(getSourceResultKey(target))
}

async function readSourceResultSnapshotByKey(
  key: string,
): Promise<SourceResultSnapshot | undefined> {
  try {
    const value: unknown = await database.sourceResultSnapshots.get(key)
    if (!isValidSourceResultSnapshot(value, key) || isExpired(value.fetchedAt)) {
      if (value !== undefined) await database.sourceResultSnapshots.delete(key)
      return undefined
    }
    return value
  } catch (error) {
    console.error("Failed to read Source result snapshot", error)
    return undefined
  }
}

export async function writeSourceResultSnapshot(
  target: SourceSnapshotTarget,
  result: SourceLoaderResult,
  fetchedAt: number,
): Promise<void> {
  try {
    await database.sourceResultSnapshots.put({
      fetchedAt,
      key: getSourceResultKey(target),
      result,
    })
  } catch (error) {
    console.error("Failed to persist Source result snapshot", error)
  }
}

async function readLiveCardSnapshot(
  cardId: string,
): Promise<LiveCardSnapshot | undefined> {
  try {
    const value: unknown = await database.liveCardSnapshots.get(cardId)
    if (!isValidLiveCardSnapshot(value, cardId) || isExpired(value.fetchedAt)) {
      if (value !== undefined) await database.liveCardSnapshots.delete(cardId)
      return undefined
    }
    return value
  } catch (error) {
    console.error("Failed to read LiveCard snapshot", error)
    return undefined
  }
}

export async function writeLiveCardSnapshot(
  cardId: string,
  response: SourceLoadResponse,
): Promise<void> {
  const resultKey = getSourceResultKey({
    params: response.params,
    sourceId: response.result.source.id,
    version: response.result.source.version,
  })
  try {
    await database.transaction(
      "rw",
      database.liveCardSnapshots,
      database.sourceResultSnapshots,
      async () => {
        const hasResult = await database.sourceResultSnapshots
          .where(":id")
          .equals(resultKey)
          .count()
        if (hasResult === 0) return
        await database.liveCardSnapshots.put({
          cardId,
          fetchedAt: response.fetchedAt,
          metadata: response.result.metadata,
          params: response.params,
          resultKey,
          source: response.result.source,
        })
      },
    )
  } catch (error) {
    console.error("Failed to persist LiveCard snapshot", error)
  }
}

export async function readLiveCardSnapshotResponse(
  cardId: string,
): Promise<SourceLoadResponse | undefined> {
  const snapshot = await readLiveCardSnapshot(cardId)
  if (!snapshot) return undefined
  const result = await readSourceResultSnapshotByKey(snapshot.resultKey)
  if (!result) {
    await database.liveCardSnapshots.delete(cardId).catch(() => undefined)
    return undefined
  }
  return {
    fetchProtected: true,
    fetchedAt: snapshot.fetchedAt,
    loadedAt: Date.now(),
    params: snapshot.params,
    result: {
      ...result.result,
      metadata: snapshot.metadata,
      source: snapshot.source,
    },
  }
}

export async function clearSourceSnapshots(): Promise<void> {
  try {
    await database.transaction(
      "rw",
      database.liveCardSnapshots,
      database.sourceResultSnapshots,
      async () => {
        await database.liveCardSnapshots.clear()
        await database.sourceResultSnapshots.clear()
      },
    )
  } catch {
    // Snapshot cleanup should not prevent the remaining user data from being cleared.
  }
}
