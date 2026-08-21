import type { ApplicationData } from "../application/data"
import type { NowLayerAutomaticSortMode, NowLayerSortMode } from "../board"
import type { Collection } from "../collection"
import type { Instance, InstancePatch } from "../source"
import type { PersistedSettings } from "./persisted-settings"
import {
  APPLICATION_DATA_VERSION,
  createEmptyApplicationData,
  ensureApplicationDataIntegrity,
} from "../application/data"
import {
  DEFAULT_NOW_LAYER_SORT,
  normalizeBoardLayer,
} from "../board"
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

export function normalizeApplicationData(value: unknown): ApplicationData {
  if (!isRecord(value)) return createEmptyApplicationData()

  const instances = normalizeInstances(value.instances)
  const instanceIds = new Set(instances.map(instance => instance.instanceId))
  const collections = value.version === APPLICATION_DATA_VERSION
    ? normalizeCollections(value.collections, instanceIds)
    : migrateLegacyCollections(value, instances, instanceIds)

  return {
    version: APPLICATION_DATA_VERSION,
    collections,
    instances,
  }
}

export function normalizeCollections(
  value: unknown,
  instanceIds?: ReadonlySet<string>,
): Collection[] {
  if (!Array.isArray(value)) return []
  const seenIds = new Set<string>()
  const seenNames: string[] = []
  return value.flatMap((candidate) => {
    const identity = normalizeCollectionIdentity(candidate, seenIds, seenNames)
    if (!identity || !isRecord(candidate)) return []

    const ids = normalizeIdentifierArray(candidate.instanceIds, instanceIds)
    const nowLayer = isRecord(candidate.nowLayer) ? candidate.nowLayer : {}
    const sortValue = isRecord(nowLayer.sort) ? nowLayer.sort : {}
    const mode = normalizeNowLayerSortMode(sortValue.mode)
    const automaticMode = normalizeNowLayerAutomaticSortMode(sortValue.automaticMode)
    return [{
      ...identity,
      defaultLayer: normalizeBoardLayer(candidate.defaultLayer),
      instanceIds: ids,
      nowLayer: {
        ...(isThemeColor(nowLayer.color) ? { color: nowLayer.color } : {}),
        sort: {
          mode,
          automaticMode: mode === "manual" ? automaticMode : mode,
          manualOrder: reconcileOrder(
            normalizeIdentifierArray(sortValue.manualOrder, instanceIds),
            ids,
          ),
        },
      },
    }]
  })
}

export function normalizeInstances(value: unknown): Instance[] {
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
      || !isInstancePatch(candidate.patch)
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
      || !isRecord(value.data)
      || (value.version !== 1 && value.version !== PERSISTED_DATA_EXPORT_VERSION)) {
      return undefined
    }

    const data = normalizePartialPersistedUserData(value.data)
    if (Object.keys(data).length === 0) return undefined

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
  const includesApplicationData = selected.has("boards") || selected.has("instances")
  return {
    ...(includesApplicationData ? { version: APPLICATION_DATA_VERSION } : {}),
    ...(selected.has("settings") && data.settings !== undefined ? { settings: data.settings } : {}),
    ...(selected.has("boards") && data.collections !== undefined ? { collections: data.collections } : {}),
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
}

export function mergePersistedUserData(
  current: PersistedUserData,
  imported: Partial<PersistedUserData>,
): PersistedUserData {
  return normalizePersistedUserData({
    version: APPLICATION_DATA_VERSION,
    settings: imported.settings ?? current.settings,
    collections: imported.collections ?? current.collections,
    instances: imported.instances ?? current.instances,
  })
}

export function normalizePersistedUserData(data: PersistedUserData): PersistedUserData {
  const application = ensureApplicationDataIntegrity(normalizeApplicationData(data))
  const collectionIds = new Set(application.collections.map(collection => collection.id))
  const settings = normalizePersistedSettings(data.settings)
  if (settings.general.defaultBoardId !== null
    && !collectionIds.has(settings.general.defaultBoardId)) {
    settings.general.defaultBoardId = application.collections[0]?.id ?? null
  }
  return { ...application, settings }
}

function normalizePartialPersistedUserData(
  data: Record<string, unknown>,
): Partial<PersistedUserData> {
  const hasInstances = Object.hasOwn(data, "instances")
  const instances = normalizeInstances(data.instances)
  const instanceIds = hasInstances
    ? new Set(instances.map(instance => instance.instanceId))
    : undefined
  const collections = Object.hasOwn(data, "collections")
    ? data.version === APPLICATION_DATA_VERSION
      ? normalizeCollections(data.collections, instanceIds)
      : migrateLegacyCollections(data, instances, instanceIds)
    : undefined
  return {
    ...((collections || hasInstances) ? { version: APPLICATION_DATA_VERSION } : {}),
    ...(Object.hasOwn(data, "settings") ? { settings: normalizePersistedSettings(data.settings) } : {}),
    ...(collections ? { collections } : {}),
    ...(hasInstances ? { instances } : {}),
  }
}

interface LegacyCollectionEntry {
  addedAt: number
  collectionId: string
  instanceId: string
  position: number
}

function migrateLegacyCollections(
  value: Record<string, unknown>,
  instances: readonly Instance[],
  instanceIds?: ReadonlySet<string>,
): Collection[] {
  const identities = normalizeLegacyCollectionIdentities(value.collections)
  const collectionIds = new Set(identities.map(collection => collection.id))
  const entries = normalizeLegacyCollectionEntries(value.collectionEntries, collectionIds, instanceIds)
  const views = normalizeLegacyCollectionViews(value.collectionViews, collectionIds)
  const instancesById = new Map(instances.map(instance => [instance.instanceId, instance]))

  return identities.map((identity) => {
    const collectionEntries = entries.filter(entry => entry.collectionId === identity.id)
    const instanceIdsByCreatedAt = collectionEntries
      .toSorted((left, right) => {
        const leftCreatedAt = instancesById.get(left.instanceId)?.createdAt ?? left.addedAt
        const rightCreatedAt = instancesById.get(right.instanceId)?.createdAt ?? right.addedAt
        return rightCreatedAt - leftCreatedAt
          || right.position - left.position
          || left.instanceId.localeCompare(right.instanceId)
      })
      .map(entry => entry.instanceId)
    const manualOrder = collectionEntries
      .toSorted((left, right) => left.position - right.position || left.instanceId.localeCompare(right.instanceId))
      .map(entry => entry.instanceId)
    const view = views.get(identity.id)
    const mode = normalizeNowLayerSortMode(view?.sortMode)
    const automaticMode = normalizeNowLayerAutomaticSortMode(view?.automaticSortMode)
    return {
      ...identity,
      defaultLayer: normalizeBoardLayer(view?.defaultLayer),
      instanceIds: instanceIdsByCreatedAt,
      nowLayer: {
        ...(isThemeColor(view?.color) ? { color: view.color } : {}),
        sort: {
          mode,
          automaticMode: mode === "manual" ? automaticMode : mode,
          manualOrder,
        },
      },
    }
  })
}

function normalizeCollectionIdentity(
  candidate: unknown,
  seenIds: Set<string>,
  seenNames: string[],
): Pick<Collection, "createdAt" | "id" | "name"> | undefined {
  if (!isRecord(candidate)
    || typeof candidate.id !== "string"
    || candidate.id.trim().length === 0
    || typeof candidate.name !== "string"
    || candidate.name.trim().length === 0
    || typeof candidate.createdAt !== "number"
    || !Number.isFinite(candidate.createdAt)
    || seenIds.has(candidate.id)) {
    return undefined
  }
  const name = candidate.name.trim()
  if (seenNames.some(existingName => existingName.localeCompare(
    name,
    undefined,
    { sensitivity: "accent" },
  ) === 0)) {
    return undefined
  }
  seenIds.add(candidate.id)
  seenNames.push(name)
  return { id: candidate.id, name, createdAt: candidate.createdAt }
}

function normalizeLegacyCollectionIdentities(value: unknown): Array<Pick<Collection, "createdAt" | "id" | "name">> {
  if (!Array.isArray(value)) return []
  const seenIds = new Set<string>()
  const seenNames: string[] = []
  return value.flatMap((candidate) => {
    const identity = normalizeCollectionIdentity(candidate, seenIds, seenNames)
    return identity ? [identity] : []
  })
}

function normalizeLegacyCollectionEntries(
  value: unknown,
  collectionIds: ReadonlySet<string>,
  instanceIds?: ReadonlySet<string>,
): LegacyCollectionEntry[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value.flatMap((candidate) => {
    if (!isRecord(candidate)
      || typeof candidate.collectionId !== "string"
      || !collectionIds.has(candidate.collectionId)
      || typeof candidate.instanceId !== "string"
      || (instanceIds && !instanceIds.has(candidate.instanceId))
      || typeof candidate.addedAt !== "number"
      || !Number.isFinite(candidate.addedAt)
      || typeof candidate.position !== "number"
      || !Number.isInteger(candidate.position)
      || candidate.position < 0) {
      return []
    }
    const key = `${candidate.collectionId}\0${candidate.instanceId}`
    if (seen.has(key)) return []
    seen.add(key)
    return [{
      addedAt: candidate.addedAt,
      collectionId: candidate.collectionId,
      instanceId: candidate.instanceId,
      position: candidate.position,
    }]
  })
}

function normalizeLegacyCollectionViews(
  value: unknown,
  collectionIds: ReadonlySet<string>,
): Map<string, Record<string, unknown>> {
  const views = new Map<string, Record<string, unknown>>()
  if (!Array.isArray(value)) return views
  for (const candidate of value) {
    if (isRecord(candidate)
      && typeof candidate.collectionId === "string"
      && collectionIds.has(candidate.collectionId)) {
      views.set(candidate.collectionId, candidate)
    }
  }
  return views
}

function normalizeIdentifierArray(
  value: unknown,
  allowedIds?: ReadonlySet<string>,
): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value.flatMap((candidate) => {
    if (typeof candidate !== "string"
      || candidate.trim().length === 0
      || seen.has(candidate)
      || (allowedIds && !allowedIds.has(candidate))) {
      return []
    }
    seen.add(candidate)
    return [candidate]
  })
}

function reconcileOrder(order: string[], instanceIds: string[]): string[] {
  const instanceIdSet = new Set(instanceIds)
  const ordered = order.filter(instanceId => instanceIdSet.has(instanceId))
  const orderedSet = new Set(ordered)
  return [...ordered, ...instanceIds.filter(instanceId => !orderedSet.has(instanceId))]
}

function normalizeNowLayerSortMode(value: unknown): NowLayerSortMode {
  return value === "provider" || value === "manual"
    ? value
    : DEFAULT_NOW_LAYER_SORT.mode
}

function normalizeNowLayerAutomaticSortMode(value: unknown): NowLayerAutomaticSortMode {
  return value === "provider" ? value : DEFAULT_NOW_LAYER_SORT.automaticMode
}

function isInstancePatch(value: unknown): value is InstancePatch {
  return isRecord(value)
    && (value.params === undefined || isRecord(value.params))
    && (value.metadata === undefined || isRecord(value.metadata))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}
