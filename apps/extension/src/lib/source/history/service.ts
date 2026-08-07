import type { Table, Transaction } from "dexie"
import type { SourceLoadResult } from "../loader"
import type {
  SourceHistoryDatasetRecord,
  SourceHistoryItemRecord,
  SourceHistoryMetadataRecord,
  SourceHistoryObservationRecord,
  SourceHistoryRevisionRecord,
  SourceHistorySnapshotRecord,
} from "./database"
import type { NewsItem } from "@/typings/source"
import { hashString, stableStringify } from "@newsnext/shared/utils"
import {
  sourceHistoryDatabase as database,
  HISTORY_METADATA_KEY,
  requireSourceHistoryId as requireId,
  withSourceHistorySize as withEstimatedSize,
} from "./database"
import {
  buildSourceHistoryDatasetKey,
  buildSourceHistoryItemIdentity,
  buildSourceHistorySnapshotIdentity,
  getSourceHistoryKind,
  SOURCE_HISTORY_MAX_AGE_MS,
  SOURCE_HISTORY_MAX_BYTES,
} from "./values"

const SOURCE_HISTORY_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000
const SOURCE_HISTORY_BATCH_SIZE = 250

export interface RecordSourceObservationInput {
  params: Record<string, unknown>
  providerId: string
  result: SourceLoadResult
  sourceId: string
  sourceVersion: number
}

interface SourceHistoryTransactionTables {
  datasets: Table<SourceHistoryDatasetRecord, number>
  items: Table<SourceHistoryItemRecord, number>
  metadata: Table<SourceHistoryMetadataRecord, string>
  observations: Table<SourceHistoryObservationRecord, number>
  revisions: Table<SourceHistoryRevisionRecord, number>
  snapshots: Table<SourceHistorySnapshotRecord, number>
}

let cleanupPromise: Promise<void> | undefined

function getTransactionTables(transaction: Transaction): SourceHistoryTransactionTables {
  return {
    datasets: transaction.table("datasets"),
    items: transaction.table("items"),
    metadata: transaction.table("metadata"),
    observations: transaction.table("observations"),
    revisions: transaction.table("revisions"),
    snapshots: transaction.table("snapshots"),
  }
}

export async function recordSourceObservation(input: RecordSourceObservationInput): Promise<void> {
  await writeSourceObservation(input, false)
}

export async function seedSourceHistoryFromCache(input: RecordSourceObservationInput): Promise<void> {
  await writeSourceObservation(input, true)
}

async function writeSourceObservation(
  input: RecordSourceObservationInput,
  onlyWhenDatasetMissing: boolean,
): Promise<void> {
  try {
    const identity = buildSourceHistoryDatasetKey(input.sourceId, input.params)
    await database.transaction(
      "rw",
      [
        database.datasets,
        database.items,
        database.metadata,
        database.observations,
        database.revisions,
        database.snapshots,
      ],
      async (transaction) => {
        const tables = getTransactionTables(transaction)
        let sizeDelta = 0
        let dataset = await tables.datasets.where("identity").equals(identity).first()
        if (onlyWhenDatasetMissing && dataset) return

        if (!dataset) {
          const initialDataset = withEstimatedSize({
            identity,
            latestSnapshotId: 0,
            lastObservedAt: input.result.updatedAt,
            observationCount: 0,
            params: input.params,
            providerId: input.providerId,
            sourceId: input.sourceId,
          })
          const id = await tables.datasets.add(initialDataset)
          dataset = { ...initialDataset, id }
          sizeDelta += initialDataset.size
        } else if (await tables.observations
          .where("[datasetId+observedAt]")
          .equals([requireId(dataset), input.result.updatedAt])
          .first()) {
          return
        }

        const itemRevisionIds = await resolveItemRevisions(
          tables,
          input.providerId,
          input.result.items,
          delta => sizeDelta += delta,
        )
        const kind = getSourceHistoryKind(input.result.items)
        const snapshotIdentity = buildSourceHistorySnapshotIdentity(
          kind,
          itemRevisionIds,
          input.result.metadata,
        )
        const digest = hashString(snapshotIdentity)
        const currentSnapshot = dataset.latestSnapshotId
          ? await tables.snapshots.get(dataset.latestSnapshotId)
          : undefined
        let snapshot = currentSnapshot

        if (!snapshot || !isSameSnapshot(snapshot, digest, snapshotIdentity)) {
          const newSnapshot = withEstimatedSize({
            datasetId: requireId(dataset),
            digest,
            itemRevisionIds,
            kind,
            ...(input.result.metadata ? { metadata: input.result.metadata } : {}),
            observationCount: 0,
          })
          const id = await tables.snapshots.add(newSnapshot)
          snapshot = { ...newSnapshot, id }
          sizeDelta += newSnapshot.size
          sizeDelta += await incrementRevisionReferences(tables, itemRevisionIds)
        }

        const updatedSnapshot = withEstimatedSize({
          ...snapshot,
          observationCount: snapshot.observationCount + 1,
        })
        await tables.snapshots.put(updatedSnapshot)
        sizeDelta += updatedSnapshot.size - snapshot.size

        const observation = withEstimatedSize({
          datasetId: requireId(dataset),
          observedAt: input.result.updatedAt,
          snapshotId: requireId(snapshot),
          sourceVersion: input.sourceVersion,
        })
        await tables.observations.add(observation)
        sizeDelta += observation.size

        const isLatest = input.result.updatedAt >= dataset.lastObservedAt
        const updatedDataset = withEstimatedSize({
          ...dataset,
          latestSnapshotId: isLatest ? requireId(snapshot) : dataset.latestSnapshotId,
          lastObservedAt: Math.max(dataset.lastObservedAt, input.result.updatedAt),
          observationCount: dataset.observationCount + 1,
        })
        await tables.datasets.put(updatedDataset)
        sizeDelta += updatedDataset.size - dataset.size
        await updateEstimatedBytes(tables.metadata, sizeDelta)
      },
    )
    void scheduleSourceHistoryCleanup(Date.now()).catch(() => undefined)
  } catch {
    // History persistence is best-effort and must not block source loading.
  }
}

async function resolveItemRevisions(
  tables: SourceHistoryTransactionTables,
  providerId: string,
  newsItems: readonly NewsItem[],
  addSizeDelta: (delta: number) => void,
): Promise<number[]> {
  const urls = [...new Set(newsItems.map(item => item.url))]
  const existingItems = await tables.items
    .where("[providerId+url]")
    .anyOf(urls.map(url => buildSourceHistoryItemIdentity(providerId, url)))
    .toArray()
  const itemsByUrl = new Map(existingItems.map(item => [item.url, item]))
  const missingItems = urls
    .filter(url => !itemsByUrl.has(url))
    .map(url => withEstimatedSize({
      providerId,
      revisionCount: 0,
      url,
    }))
  if (missingItems.length) {
    const ids = await tables.items.bulkAdd(missingItems, { allKeys: true })
    missingItems.forEach((item, index) => {
      const id = ids[index]
      if (typeof id === "number") itemsByUrl.set(item.url, { ...item, id })
      addSizeDelta(item.size)
    })
  }

  const requests = newsItems.map((item) => {
    const historyItem = itemsByUrl.get(item.url)
    if (!historyItem) throw new TypeError(`Missing source history item for ${item.url}`)
    const value = stableStringify(item)
    return {
      digest: hashString(value),
      historyItem,
      item,
      value,
    }
  })
  const existingRevisions = await tables.revisions
    .where("[itemId+digest]")
    .anyOf(requests.map(request => [requireId(request.historyItem), request.digest]))
    .toArray()
  const revisionsByValue = new Map(
    existingRevisions.map(revision => [
      `${revision.itemId}:${stableStringify(revision.item)}`,
      revision,
    ]),
  )
  const newRevisionsByValue = new Map<string, SourceHistoryRevisionRecord>()
  for (const request of requests) {
    const key = `${requireId(request.historyItem)}:${request.value}`
    if (revisionsByValue.has(key) || newRevisionsByValue.has(key)) continue
    newRevisionsByValue.set(key, withEstimatedSize({
      digest: request.digest,
      item: request.item,
      itemId: requireId(request.historyItem),
      referenceCount: 0,
    }))
  }
  const newRevisionEntries = [...newRevisionsByValue.entries()]
  if (newRevisionEntries.length) {
    const records = newRevisionEntries.map(([, revision]) => revision)
    const ids = await tables.revisions.bulkAdd(records, { allKeys: true })
    newRevisionEntries.forEach(([key, revision], index) => {
      const id = ids[index]
      if (typeof id === "number") revisionsByValue.set(key, { ...revision, id })
      addSizeDelta(revision.size)
    })
  }

  const revisionIds = requests.map((request) => {
    const itemId = requireId(request.historyItem)
    const revision = revisionsByValue.get(`${itemId}:${request.value}`)
    if (!revision) throw new TypeError(`Missing source history revision for ${request.item.url}`)
    const revisionId = requireId(revision)
    return revisionId
  })
  const newRevisionCounts = new Map<number, number>()
  for (const revision of newRevisionsByValue.values()) {
    newRevisionCounts.set(revision.itemId, (newRevisionCounts.get(revision.itemId) ?? 0) + 1)
  }
  const updatedItems = [...itemsByUrl.values()].flatMap((item) => {
    const newRevisionCount = newRevisionCounts.get(requireId(item)) ?? 0
    return newRevisionCount
      ? [withEstimatedSize({ ...item, revisionCount: item.revisionCount + newRevisionCount })]
      : []
  })
  await tables.items.bulkPut(updatedItems)
  updatedItems.forEach((item) => {
    const previous = itemsByUrl.get(item.url)
    addSizeDelta(item.size - (previous?.size ?? 0))
  })
  return revisionIds
}

async function incrementRevisionReferences(
  tables: SourceHistoryTransactionTables,
  revisionIds: readonly number[],
): Promise<number> {
  const uniqueIds = [...new Set(revisionIds)]
  const revisions = await tables.revisions.bulkGet(uniqueIds)
  let sizeDelta = 0
  const updated = revisions.flatMap((revision) => {
    if (!revision) return []
    const updatedRevision = withEstimatedSize({
      ...revision,
      referenceCount: revision.referenceCount + 1,
    })
    sizeDelta += updatedRevision.size - revision.size
    return [updatedRevision]
  })
  await tables.revisions.bulkPut(updated)
  return sizeDelta
}

function isSameSnapshot(
  snapshot: SourceHistorySnapshotRecord,
  digest: string,
  identity: string,
): boolean {
  return snapshot.digest === digest
    && buildSourceHistorySnapshotIdentity(
      snapshot.kind,
      snapshot.itemRevisionIds,
      snapshot.metadata,
    ) === identity
}

export async function clearSourceHistory(): Promise<void> {
  try {
    await cleanupPromise?.catch(() => undefined)
    await database.transaction(
      "rw",
      [
        database.datasets,
        database.items,
        database.metadata,
        database.observations,
        database.revisions,
        database.snapshots,
      ],
      async (transaction) => {
        const tables = getTransactionTables(transaction)
        await Promise.all([
          tables.datasets.clear(),
          tables.items.clear(),
          tables.observations.clear(),
          tables.revisions.clear(),
          tables.snapshots.clear(),
        ])
        await tables.metadata.put({
          estimatedBytes: 0,
          key: HISTORY_METADATA_KEY,
          lastCleanupAt: 0,
        })
      },
    )
  } catch {
    // History cleanup should not prevent the remaining user data from being cleared.
  }
}

function scheduleSourceHistoryCleanup(now: number): Promise<void> {
  if (cleanupPromise) return cleanupPromise
  cleanupPromise = cleanupSourceHistory(now).finally(() => {
    cleanupPromise = undefined
  })
  return cleanupPromise
}

async function cleanupSourceHistory(now: number): Promise<void> {
  const metadata = await getHistoryMetadata()
  if (
    metadata.estimatedBytes <= SOURCE_HISTORY_MAX_BYTES
    && now - metadata.lastCleanupAt < SOURCE_HISTORY_CLEANUP_INTERVAL_MS
  ) {
    return
  }

  const cutoff = now - SOURCE_HISTORY_MAX_AGE_MS
  while (true) {
    const expired = await database.observations
      .where("observedAt")
      .below(cutoff)
      .limit(SOURCE_HISTORY_BATCH_SIZE)
      .toArray()
    if (!expired.length) break
    await deleteObservationBatch(expired)
  }

  while ((await getHistoryMetadata()).estimatedBytes > SOURCE_HISTORY_MAX_BYTES) {
    const oldest = await database.observations
      .orderBy("observedAt")
      .limit(SOURCE_HISTORY_BATCH_SIZE)
      .toArray()
    if (!oldest.length) break
    await deleteObservationBatch(oldest)
  }

  await database.metadata.put({
    ...(await getHistoryMetadata()),
    lastCleanupAt: now,
  })
}

async function deleteObservationBatch(observations: SourceHistoryObservationRecord[]): Promise<void> {
  await database.transaction(
    "rw",
    [
      database.datasets,
      database.items,
      database.metadata,
      database.observations,
      database.revisions,
      database.snapshots,
    ],
    async (transaction) => {
      const tables = getTransactionTables(transaction)
      let sizeDelta = -observations.reduce((total, observation) => total + observation.size, 0)
      const observationIds = observations.flatMap(observation => observation.id ?? [])
      await tables.observations.bulkDelete(observationIds)

      const datasetCounts = countValues(observations.map(observation => observation.datasetId))
      const datasets = await tables.datasets.bulkGet([...datasetCounts.keys()])
      for (const dataset of datasets) {
        if (!dataset) continue
        const observationCount = dataset.observationCount - (datasetCounts.get(requireId(dataset)) ?? 0)
        if (observationCount <= 0) {
          await tables.datasets.delete(requireId(dataset))
          sizeDelta -= dataset.size
        } else {
          const updated = withEstimatedSize({ ...dataset, observationCount })
          await tables.datasets.put(updated)
          sizeDelta += updated.size - dataset.size
        }
      }

      const snapshotCounts = countValues(observations.map(observation => observation.snapshotId))
      const snapshots = await tables.snapshots.bulkGet([...snapshotCounts.keys()])
      const removedRevisionIds: number[] = []
      for (const snapshot of snapshots) {
        if (!snapshot) continue
        const observationCount = snapshot.observationCount
          - (snapshotCounts.get(requireId(snapshot)) ?? 0)
        if (observationCount <= 0) {
          await tables.snapshots.delete(requireId(snapshot))
          sizeDelta -= snapshot.size
          removedRevisionIds.push(...new Set(snapshot.itemRevisionIds))
        } else {
          const updated = withEstimatedSize({ ...snapshot, observationCount })
          await tables.snapshots.put(updated)
          sizeDelta += updated.size - snapshot.size
        }
      }
      sizeDelta += await decrementRevisionReferences(tables, removedRevisionIds)
      await updateEstimatedBytes(tables.metadata, sizeDelta)
    },
  )
}

async function decrementRevisionReferences(
  tables: SourceHistoryTransactionTables,
  revisionIds: readonly number[],
): Promise<number> {
  const counts = countValues(revisionIds)
  const revisions = await tables.revisions.bulkGet([...counts.keys()])
  const removedItemCounts = new Map<number, number>()
  let sizeDelta = 0
  for (const revision of revisions) {
    if (!revision) continue
    const referenceCount = revision.referenceCount - (counts.get(requireId(revision)) ?? 0)
    if (referenceCount <= 0) {
      await tables.revisions.delete(requireId(revision))
      sizeDelta -= revision.size
      incrementValue(removedItemCounts, revision.itemId)
    } else {
      const updated = withEstimatedSize({ ...revision, referenceCount })
      await tables.revisions.put(updated)
      sizeDelta += updated.size - revision.size
    }
  }

  const items = await tables.items.bulkGet([...removedItemCounts.keys()])
  for (const item of items) {
    if (!item) continue
    const revisionCount = item.revisionCount - (removedItemCounts.get(requireId(item)) ?? 0)
    if (revisionCount <= 0) {
      await tables.items.delete(requireId(item))
      sizeDelta -= item.size
    } else {
      const updated = withEstimatedSize({ ...item, revisionCount })
      await tables.items.put(updated)
      sizeDelta += updated.size - item.size
    }
  }
  return sizeDelta
}

async function updateEstimatedBytes(
  metadataTable: Table<SourceHistoryMetadataRecord, string>,
  delta: number,
): Promise<void> {
  const metadata = await getHistoryMetadata(metadataTable)
  await metadataTable.put({
    ...metadata,
    estimatedBytes: Math.max(0, metadata.estimatedBytes + delta),
  })
}

async function getHistoryMetadata(
  metadataTable: Table<SourceHistoryMetadataRecord, string> = database.metadata,
): Promise<SourceHistoryMetadataRecord> {
  return await metadataTable.get(HISTORY_METADATA_KEY) ?? {
    estimatedBytes: 0,
    key: HISTORY_METADATA_KEY,
    lastCleanupAt: 0,
  }
}

function countValues<T>(values: readonly T[]): Map<T, number> {
  const counts = new Map<T, number>()
  for (const value of values) incrementValue(counts, value)
  return counts
}

function incrementValue<T>(counts: Map<T, number>, value: T): void {
  counts.set(value, (counts.get(value) ?? 0) + 1)
}
