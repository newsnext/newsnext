import type { ApplicationData } from "../application/data"
import type { Board, BoardSortPreference } from "../board"
import type { Collection, CollectionEntry, CollectionView } from "../collection"
import type { SourceInstance, SourceInstancePatch } from "../source"
import type { PersistedSettings } from "./persisted-settings"
import { createEmptyApplicationData } from "../application/data"
import { ALL_BOARD_ID, createBoardSortPreference, DEFAULT_BOARD_VIEW_MODE, normalizeBoardViewMode } from "../board"
import { normalizePersistedSettings } from "./persisted-settings"
import { isThemeColor } from "./theme-color"

export const PERSISTED_DATA_EXPORT_VERSION = 2
export const PERSISTED_DATA_EXPORT_KIND = "newsnext-user-data"
export const PERSISTED_PORTABLE_SLICE_IDS = [
  "settings",
  "boards",
  "instances",
] as const

export type PersistedPortableSliceId = typeof PERSISTED_PORTABLE_SLICE_IDS[number]

export const PERSISTED_DATA_SLICES = {
  settings: {
    key: "newsnext-settings",
    scope: "portable",
  },
  application: {
    key: "newsnext-application-data",
    scope: "portable",
  },
  deviceState: {
    key: "newsnext-device-state",
    scope: "device",
  },
  secrets: {
    key: "newsnext_source_secrets",
    scope: "device",
  },
} as const satisfies Record<string, {
  key: string
  scope: "device" | "portable"
}>

export interface PersistedUserData extends ApplicationData {
  settings: PersistedSettings
}

export interface PersistedDataExport {
  data: Partial<PersistedUserData>
  kind: typeof PERSISTED_DATA_EXPORT_KIND
  version: typeof PERSISTED_DATA_EXPORT_VERSION
}

interface LegacySourceInstance extends SourceInstance {
  boardId: string | null
}

export function normalizeApplicationData(value: unknown): ApplicationData {
  if (!isRecord(value)) {
    return createEmptyApplicationData()
  }

  const collections = normalizeCollections(value.collections)
  const collectionIds = new Set(collections.map(collection => collection.id))
  const instances = normalizeSourceInstances(value.instances)
  const instanceIds = new Set(instances.map(instance => instance.instanceId))
  const collectionViews = normalizeCollectionViews(value.collectionViews, collectionIds)
  const collectionEntries = normalizeCollectionEntries(
    value.collectionEntries,
    collectionIds,
    instanceIds,
  )

  return { collections, collectionEntries, collectionViews, instances }
}

export function normalizeCollections(value: unknown): Collection[] {
  if (!Array.isArray(value)) return []
  const seenIds = new Set<string>()
  const seenNames: string[] = []
  return value.flatMap((candidate) => {
    if (!isRecord(candidate)
      || typeof candidate.id !== "string"
      || candidate.id.trim().length === 0
      || candidate.id === ALL_BOARD_ID
      || typeof candidate.name !== "string"
      || candidate.name.trim().length === 0
      || typeof candidate.createdAt !== "number"
      || !Number.isFinite(candidate.createdAt)
      || seenIds.has(candidate.id)) {
      return []
    }
    const name = candidate.name.trim()
    if (seenNames.some(existingName => existingName.localeCompare(
      name,
      undefined,
      { sensitivity: "accent" },
    ) === 0)) {
      return []
    }
    seenIds.add(candidate.id)
    seenNames.push(name)
    return [{ id: candidate.id, name, createdAt: candidate.createdAt }]
  })
}

export function normalizeSourceInstances(value: unknown): SourceInstance[] {
  if (!Array.isArray(value)) return []
  const seenIds = new Set<string>()
  return value.flatMap((candidate) => {
    if (!isRecord(candidate)
      || typeof candidate.instanceId !== "string"
      || candidate.instanceId.trim().length === 0
      || typeof candidate.sourceId !== "string"
      || candidate.sourceId.trim().length === 0
      || typeof candidate.createdAt !== "number"
      || !Number.isFinite(candidate.createdAt)
      || !isSourceInstancePatch(candidate.patch)
      || seenIds.has(candidate.instanceId)) {
      return []
    }
    seenIds.add(candidate.instanceId)
    return [{
      instanceId: candidate.instanceId,
      sourceId: candidate.sourceId,
      patch: candidate.patch,
      createdAt: candidate.createdAt,
    }]
  })
}

export function createPersistedDataExport(
  data: PersistedUserData,
  sliceIds: readonly PersistedPortableSliceId[] = PERSISTED_PORTABLE_SLICE_IDS,
): PersistedDataExport {
  return {
    data: selectPersistedUserData(normalizePersistedUserData(data), sliceIds),
    kind: PERSISTED_DATA_EXPORT_KIND,
    version: PERSISTED_DATA_EXPORT_VERSION,
  }
}

export function parsePersistedDataExport(serialized: string): PersistedDataExport | undefined {
  try {
    const value: unknown = JSON.parse(serialized)
    if (!isRecord(value)
      || value.kind !== PERSISTED_DATA_EXPORT_KIND
      || !isRecord(value.data)) {
      return undefined
    }

    const data = value.version === PERSISTED_DATA_EXPORT_VERSION
      ? normalizePartialPersistedUserData(value.data)
      : value.version === 1
        ? migrateLegacyPersistedUserData(value.data)
        : undefined
    if (!data || Object.keys(data).length === 0) return undefined

    return {
      data,
      kind: PERSISTED_DATA_EXPORT_KIND,
      version: PERSISTED_DATA_EXPORT_VERSION,
    }
  } catch {
    return undefined
  }
}

export function serializePersistedDataExport(
  data: PersistedUserData,
  sliceIds: readonly PersistedPortableSliceId[] = PERSISTED_PORTABLE_SLICE_IDS,
): string {
  return JSON.stringify(createPersistedDataExport(data, sliceIds), null, 2)
}

export function selectPersistedUserData(
  data: Partial<PersistedUserData>,
  sliceIds: readonly PersistedPortableSliceId[],
): Partial<PersistedUserData> {
  const selected = new Set(sliceIds)
  return {
    ...(selected.has("settings") && data.settings !== undefined ? { settings: data.settings } : {}),
    ...(selected.has("boards")
      ? {
          ...(data.collections !== undefined ? { collections: data.collections } : {}),
          ...(data.collectionEntries !== undefined ? { collectionEntries: data.collectionEntries } : {}),
          ...(data.collectionViews !== undefined ? { collectionViews: data.collectionViews } : {}),
        }
      : {}),
    ...(selected.has("instances") && data.instances !== undefined ? { instances: data.instances } : {}),
  }
}

export function hasPersistedUserDataSlice(
  data: Partial<PersistedUserData>,
  sliceId: PersistedPortableSliceId,
): boolean {
  if (sliceId === "settings") return data.settings !== undefined
  if (sliceId === "instances") return data.instances !== undefined
  return data.collections !== undefined
    || data.collectionEntries !== undefined
    || data.collectionViews !== undefined
}

export function mergePersistedUserData(
  current: PersistedUserData,
  imported: Partial<PersistedUserData>,
): PersistedUserData {
  return normalizePersistedUserData({
    settings: imported.settings ?? current.settings,
    collections: imported.collections ?? current.collections,
    collectionEntries: imported.collectionEntries ?? current.collectionEntries,
    collectionViews: imported.collectionViews ?? current.collectionViews,
    instances: imported.instances ?? current.instances,
  })
}

export function normalizePersistedUserData(data: PersistedUserData): PersistedUserData {
  const application = normalizeApplicationData(data)
  const collectionIds = new Set(application.collections.map(collection => collection.id))
  const settings = normalizePersistedSettings(data.settings)
  if (settings.general.defaultBoardId !== null
    && settings.general.defaultBoardId !== ALL_BOARD_ID
    && !collectionIds.has(settings.general.defaultBoardId)) {
    settings.general.defaultBoardId = ALL_BOARD_ID
  }
  return { ...application, settings }
}

function normalizePartialPersistedUserData(
  data: Record<string, unknown>,
): Partial<PersistedUserData> {
  const collections = normalizeCollections(data.collections)
  const instances = normalizeSourceInstances(data.instances)
  const collectionIds = Object.hasOwn(data, "collections")
    ? new Set(collections.map(collection => collection.id))
    : undefined
  const instanceIds = Object.hasOwn(data, "instances")
    ? new Set(instances.map(instance => instance.instanceId))
    : undefined
  return {
    ...(Object.hasOwn(data, "settings") ? { settings: normalizePersistedSettings(data.settings) } : {}),
    ...(Object.hasOwn(data, "collections") ? { collections } : {}),
    ...(Object.hasOwn(data, "collectionEntries")
      ? {
          collectionEntries: normalizeCollectionEntries(data.collectionEntries, collectionIds, instanceIds),
        }
      : {}),
    ...(Object.hasOwn(data, "collectionViews")
      ? {
          collectionViews: normalizeCollectionViews(data.collectionViews, collectionIds),
        }
      : {}),
    ...(Object.hasOwn(data, "instances") ? { instances } : {}),
  }
}

function migrateLegacyPersistedUserData(
  data: Record<string, unknown>,
): Partial<PersistedUserData> {
  const boards = Object.hasOwn(data, "boards") ? normalizeLegacyBoards(data.boards) : undefined
  const instances = Object.hasOwn(data, "instances")
    ? normalizeLegacySourceInstances(data.instances)
    : undefined
  const collections = boards?.map((board, index) => ({
    id: board.id,
    name: board.name,
    createdAt: index,
  }))
  const collectionIds = new Set(collections?.map(collection => collection.id) ?? [])
  const collectionEntries = instances?.flatMap((instance, index) => (
    instance.boardId && collectionIds.has(instance.boardId)
      ? [{
          collectionId: instance.boardId,
          instanceId: instance.instanceId,
          addedAt: instance.createdAt,
          position: getLegacyPosition(boards ?? [], instance.boardId, instance.instanceId, index),
        }]
      : []
  ))

  return {
    ...(Object.hasOwn(data, "settings") ? { settings: normalizePersistedSettings(data.settings) } : {}),
    ...(boards
      ? {
          collections,
          collectionViews: boards.map(board => ({
            collectionId: board.id,
            color: board.color,
            defaultView: board.defaultView,
            sortMode: board.sort.mode,
            automaticSortMode: board.sort.automaticMode,
          })),
          collectionEntries: collectionEntries ?? [],
        }
      : {}),
    ...(instances
      ? {
          instances: instances.map(({ boardId: _boardId, ...instance }) => instance),
          ...(!boards ? { collectionEntries: [] } : {}),
        }
      : {}),
  }
}

function normalizeCollectionViews(value: unknown, collectionIds?: Set<string>): CollectionView[] {
  if (!Array.isArray(value)) return []
  const views = new Map<string, CollectionView>()
  for (const candidate of value) {
    if (!isRecord(candidate)
      || typeof candidate.collectionId !== "string"
      || (collectionIds && !collectionIds.has(candidate.collectionId))
      || !isBoardSortMode(candidate.sortMode)
      || !isAutomaticBoardSortMode(candidate.automaticSortMode)) {
      continue
    }
    views.set(candidate.collectionId, {
      collectionId: candidate.collectionId,
      defaultView: normalizeBoardViewMode(candidate.defaultView),
      sortMode: candidate.sortMode,
      automaticSortMode: candidate.automaticSortMode,
      ...(isThemeColor(candidate.color) ? { color: candidate.color } : {}),
    })
  }
  if (!collectionIds) return [...views.values()]
  return [...collectionIds].map(collectionId => views.get(collectionId) ?? {
    collectionId,
    defaultView: DEFAULT_BOARD_VIEW_MODE,
    sortMode: "createdAt",
    automaticSortMode: "createdAt",
  })
}

function normalizeCollectionEntries(
  value: unknown,
  collectionIds?: Set<string>,
  instanceIds?: Set<string>,
): CollectionEntry[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const entries = value.flatMap((candidate, inputIndex) => {
    if (!isRecord(candidate)
      || typeof candidate.collectionId !== "string"
      || candidate.collectionId.trim().length === 0
      || typeof candidate.instanceId !== "string"
      || candidate.instanceId.trim().length === 0
      || typeof candidate.addedAt !== "number"
      || !Number.isFinite(candidate.addedAt)
      || typeof candidate.position !== "number"
      || !Number.isInteger(candidate.position)
      || candidate.position < 0
      || (collectionIds && !collectionIds.has(candidate.collectionId))
      || (instanceIds && !instanceIds.has(candidate.instanceId))) {
      return []
    }
    const key = `${candidate.collectionId}\0${candidate.instanceId}`
    if (seen.has(key)) return []
    seen.add(key)
    return [{
      collectionId: candidate.collectionId,
      instanceId: candidate.instanceId,
      addedAt: candidate.addedAt,
      position: candidate.position,
      inputIndex,
    }]
  })
  const entriesByCollection = new Map<string, typeof entries>()
  for (const entry of entries) {
    const collectionEntries = entriesByCollection.get(entry.collectionId) ?? []
    collectionEntries.push(entry)
    entriesByCollection.set(entry.collectionId, collectionEntries)
  }
  return [...entriesByCollection.values()].flatMap(collectionEntries => (
    collectionEntries
      .toSorted((left, right) => (
        left.position - right.position
        || left.addedAt - right.addedAt
        || left.inputIndex - right.inputIndex
      ))
      .map(({ inputIndex: _inputIndex, ...entry }, position) => ({ ...entry, position }))
  ))
}

function normalizeLegacyBoards(value: unknown): Board[] {
  if (!Array.isArray(value)) return []
  const seenIds = new Set<string>()
  return value.flatMap((candidate) => {
    if (!isRecord(candidate)
      || typeof candidate.id !== "string"
      || candidate.id === ALL_BOARD_ID
      || typeof candidate.name !== "string"
      || seenIds.has(candidate.id)) {
      return []
    }
    seenIds.add(candidate.id)
    return [{
      defaultView: normalizeBoardViewMode(candidate.defaultView),
      id: candidate.id,
      name: candidate.name,
      sort: normalizeBoardSortPreference(candidate.sort),
      ...(isThemeColor(candidate.color) ? { color: candidate.color } : {}),
    }]
  })
}

function normalizeLegacySourceInstances(value: unknown): LegacySourceInstance[] {
  if (!Array.isArray(value)) return []
  return normalizeSourceInstances(value).map((instance) => {
    const candidate = value.find(value => isRecord(value) && value.instanceId === instance.instanceId)
    return {
      ...instance,
      boardId: isRecord(candidate) && typeof candidate.boardId === "string" ? candidate.boardId : null,
    }
  })
}

function getLegacyPosition(
  boards: Board[],
  collectionId: string,
  instanceId: string,
  fallback: number,
): number {
  const position = boards.find(board => board.id === collectionId)?.sort.manualOrder.indexOf(instanceId)
  return position === undefined || position < 0 ? fallback : position
}

function normalizeBoardSortPreference(value: unknown): BoardSortPreference {
  if (isRecord(value)
    && isBoardSortMode(value.mode)
    && isAutomaticBoardSortMode(value.automaticMode)
    && Array.isArray(value.manualOrder)
    && value.manualOrder.every(id => typeof id === "string")) {
    return { mode: value.mode, automaticMode: value.automaticMode, manualOrder: [...value.manualOrder] }
  }
  return createBoardSortPreference()
}

function isSourceInstancePatch(value: unknown): value is SourceInstancePatch {
  return isRecord(value)
    && (value.params === undefined || isRecord(value.params))
    && (value.metadata === undefined || isRecord(value.metadata))
}

function isBoardSortMode(value: unknown): value is CollectionView["sortMode"] {
  return value === "createdAt" || value === "provider" || value === "manual"
}

function isAutomaticBoardSortMode(value: unknown): value is CollectionView["automaticSortMode"] {
  return value === "createdAt" || value === "provider"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}
