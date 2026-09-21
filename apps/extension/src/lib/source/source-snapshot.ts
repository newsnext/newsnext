import type { SourceLoadResult } from "./load-result"
import Dexie from "dexie"
import { getSourceQueryHash } from "./query-target"

const SOURCE_SNAPSHOT_DATABASE_NAME = "newsnext-extension-source-snapshot"
const SOURCE_SNAPSHOT_SCHEMA_VERSION = 2
const SOURCE_SNAPSHOT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

export interface SourceSnapshotTarget {
  params: Record<string, unknown>
  sourceId: string
  version: number
}

export interface SourceSnapshot {
  fetchedAt: number
  key: string
  result: SourceLoadResult
  schemaVersion: number
}

class SourceSnapshotDatabase extends Dexie {
  sourceSnapshots!: Dexie.Table<SourceSnapshot, string>

  constructor() {
    super(SOURCE_SNAPSHOT_DATABASE_NAME)
    this.version(8).stores({
      sourceSnapshots: "key, fetchedAt",
    })
  }
}

const database = new SourceSnapshotDatabase()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isValidSourceSnapshot(
  value: unknown,
  target: SourceSnapshotTarget,
  key: string,
): value is SourceSnapshot {
  const snapshot = asReadableSnapshot(value)
  return snapshot !== undefined
    && snapshot.key === key
    && snapshot.result.source.id === target.sourceId
    && snapshot.result.source.version === target.version
}

interface ReadableSnapshot {
  fetchedAt: number
  key: string
  result: {
    inlinePresentation?: unknown
    items: unknown[]
    source: Record<string, unknown>
  }
  schemaVersion: number
}

// Shape checks shared by keyed reads and latest-version scans: valid enough
// to render from, without trusting any single field.
function asReadableSnapshot(value: unknown): ReadableSnapshot | undefined {
  if (!isRecord(value) || !isRecord(value.result)) {
    return undefined
  }
  const { fetchedAt, key, result, schemaVersion } = value
  const source = result.source
  if (
    typeof fetchedAt !== "number"
    || !Number.isFinite(fetchedAt)
    || fetchedAt <= 0
    || typeof key !== "string"
    || schemaVersion !== SOURCE_SNAPSHOT_SCHEMA_VERSION
    || !Array.isArray(result.items)
    || !isValidInlinePresentation(result.inlinePresentation, result.items.length)
    || !isRecord(source)
  ) {
    return undefined
  }
  return {
    fetchedAt,
    key,
    result: {
      inlinePresentation: result.inlinePresentation,
      items: result.items,
      source,
    },
    schemaVersion,
  }
}

function isValidInlinePresentation(value: unknown, itemCount: number): boolean {
  if (value === undefined) return true
  return Array.isArray(value)
    && value.length === itemCount
    && value.every(entry => typeof entry === "string")
}

function isExpired(snapshot: SourceSnapshot, now = Date.now()): boolean {
  return now - snapshot.fetchedAt > SOURCE_SNAPSHOT_MAX_AGE_MS
}

export async function readSourceSnapshot(
  target: SourceSnapshotTarget,
): Promise<SourceSnapshot | undefined> {
  try {
    const key = getSourceQueryHash(target)
    const value: unknown = await database.sourceSnapshots.get(key)
    if (!isValidSourceSnapshot(value, target, key) || isExpired(value)) {
      if (value !== undefined) await database.sourceSnapshots.delete(key)
      return undefined
    }
    return value
  } catch (error) {
    console.error("Failed to read Source snapshot", error)
    return undefined
  }
}

export async function writeSourceSnapshot(
  target: SourceSnapshotTarget,
  result: SourceLoadResult,
  fetchedAt: number,
): Promise<void> {
  try {
    await database.sourceSnapshots.put({
      fetchedAt,
      key: getSourceQueryHash(target),
      result,
      schemaVersion: SOURCE_SNAPSHOT_SCHEMA_VERSION,
    })
  } catch (error) {
    console.error("Failed to persist Source snapshot", error)
  }
}

export async function clearSourceSnapshots(): Promise<void> {
  try {
    await database.sourceSnapshots.clear()
  } catch {
    // Snapshot cleanup should not prevent the remaining user data from being cleared.
  }
}
