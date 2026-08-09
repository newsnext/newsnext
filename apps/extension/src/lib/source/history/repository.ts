import type { SourcePresentationMetadata } from "@newsnext/source/types"
import type {
  SourceHistoryDatasetRecord,
  SourceHistoryObservationRecord,
  SourceHistoryRevisionRecord,
  SourceHistorySnapshotRecord,
} from "./database"
import type {
  HydratedSourceHistoryObservation,
  SourceHistoryObservationDiff,
} from "./repository-values"
import type { SourceHistoryKind } from "./values"
import { loadSourceDescriptors, normalizeSourceParams } from "@newsnext/source/runtime"
import {
  sourceHistoryDatabase as database,
  requireSourceHistoryId as requireId,
} from "./database"
import { compareSourceHistoryObservationValues } from "./repository-values"
import { buildSourceHistoryDatasetKey } from "./values"

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 250

export interface SourceHistoryCompleteness {
  complete: boolean
  warnings: string[]
}

export interface SourceHistoryDatasetSummary {
  lastObservedAt: number
  observationCount: number
  params: Record<string, unknown>
  providerId: string
  sourceId: string
}

export interface ListSourceHistoryDatasetsInput {
  cursor?: string
  limit?: number
  providerId?: string
  sourceId?: string
}

export interface SourceHistoryDatasetPage {
  datasets: SourceHistoryDatasetSummary[]
  hasMore: boolean
  nextCursor?: string
}

export interface ListSourceHistoryObservationsInput {
  cursor?: number
  from?: number
  limit?: number
  params?: Record<string, unknown>
  sourceId: string
  to?: number
}

export interface SourceHistoryObservationSummary {
  itemCount?: number
  kind?: SourceHistoryKind
  metadata?: SourcePresentationMetadata
  observedAt: number
  sourceVersion: number
}

export interface SourceHistoryObservationPage {
  completeness: SourceHistoryCompleteness
  dataset?: SourceHistoryDatasetSummary
  hasMore: boolean
  nextCursor?: number
  observations: SourceHistoryObservationSummary[]
}

export interface GetSourceHistoryObservationInput {
  observedAt: number
  params?: Record<string, unknown>
  sourceId: string
}

export interface SourceHistoryObservationResult {
  completeness: SourceHistoryCompleteness
  dataset?: SourceHistoryDatasetSummary
  observation?: HydratedSourceHistoryObservation
}

export interface CompareSourceHistoryObservationsInput {
  after: number
  before: number
  params?: Record<string, unknown>
  sourceId: string
}

export interface SourceHistoryObservationDiffResult {
  completeness: SourceHistoryCompleteness
  dataset?: SourceHistoryDatasetSummary
  diff?: SourceHistoryObservationDiff
}

export async function listSourceHistoryDatasets(
  input: ListSourceHistoryDatasetsInput = {},
): Promise<SourceHistoryDatasetPage> {
  const limit = normalizePageSize(input.limit)
  const cursor = parseDatasetCursor(input.cursor)
  const datasets = (await database.datasets.toArray())
    .filter(dataset => input.providerId === undefined || dataset.providerId === input.providerId)
    .filter(dataset => input.sourceId === undefined || dataset.sourceId === input.sourceId)
    .sort((left, right) => (
      right.lastObservedAt - left.lastObservedAt
      || left.identity.localeCompare(right.identity)
    ))
    .filter(dataset => !cursor
      || dataset.lastObservedAt < cursor.lastObservedAt
      || (
        dataset.lastObservedAt === cursor.lastObservedAt
        && dataset.identity.localeCompare(cursor.identity) > 0
      ))
  const page = datasets.slice(0, limit + 1)
  const hasMore = page.length > limit
  const visible = page.slice(0, limit)
  return {
    datasets: visible.map(toDatasetSummary),
    hasMore,
    ...(hasMore && visible.at(-1)
      ? { nextCursor: buildDatasetCursor(visible.at(-1)!) }
      : {}),
  }
}

export async function listSourceHistoryObservations(
  input: ListSourceHistoryObservationsInput,
): Promise<SourceHistoryObservationPage> {
  const identity = await resolveDatasetIdentity(input.sourceId, input.params ?? {})
  const limit = normalizePageSize(input.limit)
  return await database.transaction(
    "r",
    [database.datasets, database.observations, database.snapshots],
    async (transaction) => {
      const datasets = transaction.table<SourceHistoryDatasetRecord, number>("datasets")
      const observations = transaction.table<SourceHistoryObservationRecord, number>("observations")
      const snapshots = transaction.table<SourceHistorySnapshotRecord, number>("snapshots")
      const dataset = await datasets.where("identity").equals(identity).first()
      if (!dataset) return emptyObservationPage()

      const lowerBound = Math.max(input.from ?? Number.MIN_SAFE_INTEGER, input.cursor ?? Number.MIN_SAFE_INTEGER)
      const upperBound = input.to ?? Number.MAX_SAFE_INTEGER
      if (lowerBound > upperBound) {
        return { ...emptyObservationPage(), dataset: toDatasetSummary(dataset) }
      }
      const includeLower = input.cursor === undefined || input.cursor < lowerBound
      const records = await observations
        .where("[datasetId+observedAt]")
        .between(
          [requireId(dataset), lowerBound],
          [requireId(dataset), upperBound],
          includeLower,
          true,
        )
        .limit(limit + 1)
        .toArray()
      const hasMore = records.length > limit
      const visible = records.slice(0, limit)
      const snapshotRecords = await snapshots.bulkGet([
        ...new Set(visible.map(record => record.snapshotId)),
      ])
      const snapshotsById = new Map(snapshotRecords.flatMap(snapshot => (
        snapshot?.id === undefined ? [] : [[snapshot.id, snapshot] as const]
      )))
      const warnings: string[] = []
      const summaries = visible.map((record) => {
        const snapshot = snapshotsById.get(record.snapshotId)
        if (!snapshot) warnings.push(`Snapshot ${record.snapshotId} is unavailable`)
        return {
          ...(snapshot
            ? {
                itemCount: snapshot.itemRevisionIds.length,
                kind: snapshot.kind,
                ...(snapshot.metadata ? { metadata: snapshot.metadata } : {}),
              }
            : {}),
          observedAt: record.observedAt,
          sourceVersion: record.sourceVersion,
        }
      })
      return {
        completeness: toCompleteness(warnings),
        dataset: toDatasetSummary(dataset),
        hasMore,
        ...(hasMore && visible.at(-1) ? { nextCursor: visible.at(-1)!.observedAt } : {}),
        observations: summaries,
      }
    },
  )
}

export async function getSourceHistoryObservation(
  input: GetSourceHistoryObservationInput,
): Promise<SourceHistoryObservationResult> {
  const identity = await resolveDatasetIdentity(input.sourceId, input.params ?? {})
  return await getSourceHistoryObservationByIdentity(identity, input.observedAt)
}

export async function compareSourceHistoryObservations(
  input: CompareSourceHistoryObservationsInput,
): Promise<SourceHistoryObservationDiffResult> {
  const identity = await resolveDatasetIdentity(input.sourceId, input.params ?? {})
  const [before, after] = await Promise.all([
    getSourceHistoryObservationByIdentity(identity, input.before),
    getSourceHistoryObservationByIdentity(identity, input.after),
  ])
  const warnings = [
    ...before.completeness.warnings.map(warning => `Before: ${warning}`),
    ...after.completeness.warnings.map(warning => `After: ${warning}`),
  ]
  if (!before.observation) warnings.push(`Before observation ${input.before} is unavailable`)
  if (!after.observation) warnings.push(`After observation ${input.after} is unavailable`)
  return {
    completeness: toCompleteness(warnings),
    dataset: before.dataset ?? after.dataset,
    ...(before.observation && after.observation
      ? { diff: compareSourceHistoryObservationValues(before.observation, after.observation) }
      : {}),
  }
}

async function getSourceHistoryObservationByIdentity(
  identity: string,
  observedAt: number,
): Promise<SourceHistoryObservationResult> {
  return await database.transaction(
    "r",
    [database.datasets, database.observations, database.revisions, database.snapshots],
    async (transaction) => {
      const datasets = transaction.table<SourceHistoryDatasetRecord, number>("datasets")
      const observations = transaction.table<SourceHistoryObservationRecord, number>("observations")
      const revisions = transaction.table<SourceHistoryRevisionRecord, number>("revisions")
      const snapshots = transaction.table<SourceHistorySnapshotRecord, number>("snapshots")
      const dataset = await datasets.where("identity").equals(identity).first()
      if (!dataset) return emptyObservationResult()
      const datasetSummary = toDatasetSummary(dataset)
      const record = await observations
        .where("[datasetId+observedAt]")
        .equals([requireId(dataset), observedAt])
        .first()
      if (!record) return { ...emptyObservationResult(), dataset: datasetSummary }
      const snapshot = await snapshots.get(record.snapshotId)
      if (!snapshot) {
        return {
          completeness: toCompleteness([`Snapshot ${record.snapshotId} is unavailable`]),
          dataset: datasetSummary,
        }
      }
      const revisionRecords = await revisions.bulkGet([...new Set(snapshot.itemRevisionIds)])
      const revisionsById = new Map(revisionRecords.flatMap(revision => (
        revision?.id === undefined ? [] : [[revision.id, revision] as const]
      )))
      const warnings: string[] = []
      const items = snapshot.itemRevisionIds.flatMap((revisionId, index) => {
        const revision = revisionsById.get(revisionId)
        if (!revision) {
          warnings.push(`Item revision ${revisionId} at position ${index + 1} is unavailable`)
          return []
        }
        return [{
          identity: { providerId: dataset.providerId, url: revision.item.url },
          position: index + 1,
          value: revision.item,
        }]
      })
      return {
        completeness: toCompleteness(warnings),
        dataset: datasetSummary,
        observation: {
          items,
          kind: snapshot.kind,
          ...(snapshot.metadata ? { metadata: snapshot.metadata } : {}),
          observedAt: record.observedAt,
          sourceVersion: record.sourceVersion,
        },
      }
    },
  )
}

async function resolveDatasetIdentity(
  sourceId: string,
  params: Record<string, unknown>,
): Promise<string> {
  const source = (await loadSourceDescriptors()).find(candidate => candidate.id === sourceId)
  if (!source) {
    throw new Error(`Source '${sourceId}' not found`)
  }
  return buildSourceHistoryDatasetKey(sourceId, normalizeSourceParams(source, params))
}

function toDatasetSummary(dataset: SourceHistoryDatasetRecord): SourceHistoryDatasetSummary {
  return {
    lastObservedAt: dataset.lastObservedAt,
    observationCount: dataset.observationCount,
    params: dataset.params,
    providerId: dataset.providerId,
    sourceId: dataset.sourceId,
  }
}

interface DatasetCursor {
  identity: string
  lastObservedAt: number
}

function buildDatasetCursor(dataset: SourceHistoryDatasetRecord): string {
  return JSON.stringify({
    identity: dataset.identity,
    lastObservedAt: dataset.lastObservedAt,
  })
}

function parseDatasetCursor(value: string | undefined): DatasetCursor | undefined {
  if (value === undefined) return
  try {
    const cursor: unknown = JSON.parse(value)
    if (
      typeof cursor === "object"
      && cursor !== null
      && "identity" in cursor
      && typeof cursor.identity === "string"
      && "lastObservedAt" in cursor
      && typeof cursor.lastObservedAt === "number"
      && Number.isFinite(cursor.lastObservedAt)
    ) {
      return { identity: cursor.identity, lastObservedAt: cursor.lastObservedAt }
    }
  } catch {
    // Invalid cursors restart pagination from the first dataset.
  }
}

function emptyObservationPage(): SourceHistoryObservationPage {
  return {
    completeness: toCompleteness([]),
    hasMore: false,
    observations: [],
  }
}

function emptyObservationResult(): SourceHistoryObservationResult {
  return {
    completeness: toCompleteness([]),
  }
}

function toCompleteness(warnings: string[]): SourceHistoryCompleteness {
  return { complete: warnings.length === 0, warnings }
}

function normalizePageSize(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_PAGE_SIZE
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(value)))
}
