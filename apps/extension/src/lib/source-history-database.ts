import type { Table } from "dexie"
import type { SourceHistoryKind } from "./source-history-values"
import type { SourceLoadResult } from "./source-loader"
import type { NewsItem } from "@/typings/source"
import Dexie from "dexie"

export const HISTORY_METADATA_KEY = "history"
const SOURCE_HISTORY_DATABASE_NAME = "newsnext-extension-source-history"
const textEncoder = new TextEncoder()

export interface SourceHistoryDatasetRecord {
  id?: number
  identity: string
  latestSnapshotId: number
  lastObservedAt: number
  observationCount: number
  params: Record<string, unknown>
  providerId: string
  size: number
  sourceId: string
}

export interface SourceHistoryItemRecord {
  id?: number
  providerId: string
  revisionCount: number
  size: number
  url: string
}

export interface SourceHistoryRevisionRecord {
  digest: string
  id?: number
  item: NewsItem
  itemId: number
  referenceCount: number
  size: number
}

export interface SourceHistorySnapshotRecord {
  datasetId: number
  digest: string
  id?: number
  itemRevisionIds: number[]
  kind: SourceHistoryKind
  metadata?: SourceLoadResult["metadata"]
  observationCount: number
  size: number
}

export interface SourceHistoryObservationRecord {
  datasetId: number
  id?: number
  observedAt: number
  size: number
  snapshotId: number
  sourceVersion: number
}

export interface SourceHistoryMetadataRecord {
  estimatedBytes: number
  key: string
  lastCleanupAt: number
}

class SourceHistoryDatabase extends Dexie {
  datasets!: Table<SourceHistoryDatasetRecord, number>
  items!: Table<SourceHistoryItemRecord, number>
  metadata!: Table<SourceHistoryMetadataRecord, string>
  observations!: Table<SourceHistoryObservationRecord, number>
  revisions!: Table<SourceHistoryRevisionRecord, number>
  snapshots!: Table<SourceHistorySnapshotRecord, number>

  constructor() {
    super(SOURCE_HISTORY_DATABASE_NAME)
    this.version(1).stores({
      datasets: "++id,&identity",
      items: "++id,&[providerId+url]",
      metadata: "key",
      observations: "++id,&[datasetId+observedAt],observedAt",
      revisions: "++id,[itemId+digest]",
      snapshots: "++id",
    })
  }
}

export const sourceHistoryDatabase = new SourceHistoryDatabase()

export function requireSourceHistoryId(record: { id?: number }): number {
  if (record.id === undefined) throw new TypeError("Source history record is missing its identifier")
  return record.id
}

export function withSourceHistorySize<T extends object>(value: T): T & { size: number } {
  return { ...value, size: estimateSourceHistorySize(value) }
}

function estimateSourceHistorySize(value: object): number {
  const { size: _size, ...record } = value as Record<string, unknown>
  return textEncoder.encode(JSON.stringify(record)).byteLength
}
