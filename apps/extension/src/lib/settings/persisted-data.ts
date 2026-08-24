import type { ApplicationData } from "../application/data"
import type {
  Board,
  NextLayerWidget,
  NextLayerWidgetDataScope,
  NowLayerAutomaticSortMode,
  NowLayerSortMode,
} from "../board"
import type { Instance, InstancePatch } from "../source"
import type { PersistedSettings } from "./persisted-settings"
import {
  APPLICATION_DATA_VERSION,
  createEmptyApplicationData,
  ensureApplicationDataIntegrity,
} from "../application/data"
import {
  DEFAULT_BOARD_COLOR,
  DEFAULT_NOW_LAYER_SORT,
  normalizeBoardLayer,
} from "../board"
import { normalizePersistedSettings } from "./persisted-settings"
import { isThemeColor } from "./theme-color"

export const PERSISTED_DATA_EXPORT_VERSION = 4
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
  const boards = normalizeBoards(value.boards, instanceIds)

  return {
    version: APPLICATION_DATA_VERSION,
    boards,
    instances,
  }
}

export function normalizeBoards(
  value: unknown,
  instanceIds?: ReadonlySet<string>,
): Board[] {
  if (!Array.isArray(value)) return []
  const seenIds = new Set<string>()
  const seenNames: string[] = []
  return value.flatMap((candidate) => {
    const identity = normalizeBoardIdentity(candidate, seenIds, seenNames)
    if (!identity || !isRecord(candidate)) return []

    const ids = normalizeIdentifierArray(candidate.instanceIds, instanceIds)
    const nowLayer = isRecord(candidate.nowLayer) ? candidate.nowLayer : {}
    const nextLayer = isRecord(candidate.nextLayer) ? candidate.nextLayer : {}
    const sortValue = isRecord(nowLayer.sort) ? nowLayer.sort : {}
    const mode = normalizeNowLayerSortMode(sortValue.mode)
    const automaticMode = normalizeNowLayerAutomaticSortMode(sortValue.automaticMode)
    return [{
      ...identity,
      color: isThemeColor(candidate.color) ? candidate.color : DEFAULT_BOARD_COLOR,
      defaultLayer: normalizeBoardLayer(candidate.defaultLayer),
      instanceIds: ids,
      nowLayer: {
        sort: {
          mode,
          automaticMode: mode === "manual" ? automaticMode : mode,
          manualOrder: reconcileOrder(
            normalizeIdentifierArray(sortValue.manualOrder, instanceIds),
            ids,
          ),
        },
      },
      nextLayer: {
        widgets: normalizeNextLayerWidgets(nextLayer.widgets, new Set(ids)),
      },
    }]
  })
}

function normalizeNextLayerWidgets(
  value: unknown,
  boardInstanceIds: ReadonlySet<string>,
): NextLayerWidget[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value.flatMap((candidate) => {
    if (!isRecord(candidate)
      || typeof candidate.widgetId !== "string"
      || candidate.widgetId.trim().length === 0
      || !/^[\w-]+$/.test(candidate.widgetId)
      || seen.has(candidate.widgetId)
      || !isRecord(candidate.layout)) {
      return []
    }
    const layout = candidate.layout
    if (!isIntegerBetween(layout.x, 0, 11)
      || !isIntegerBetween(layout.y, 0, Number.MAX_SAFE_INTEGER)
      || !isIntegerBetween(layout.width, 1, 12)
      || layout.x + layout.width > 12
      || !isIntegerBetween(layout.height, 1, 100)) {
      return []
    }
    const dataScope = normalizeWidgetDataScope(candidate.dataScope, boardInstanceIds)
    if (!dataScope) return []
    seen.add(candidate.widgetId)
    return [{
      dataScope,
      layout: {
        height: layout.height,
        width: layout.width,
        x: layout.x,
        y: layout.y,
      },
      widgetId: candidate.widgetId,
    }]
  })
}

function normalizeWidgetDataScope(
  value: unknown,
  boardInstanceIds: ReadonlySet<string>,
): NextLayerWidgetDataScope | undefined {
  if (!isRecord(value) || typeof value.type !== "string") return undefined
  if (value.type === "board") return { type: "board" }
  if (value.type !== "instances") return undefined
  return {
    type: "instances",
    instanceIds: normalizeIdentifierArray(value.instanceIds, boardInstanceIds),
  }
}

function isIntegerBetween(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isInteger(value) && Number(value) >= minimum && Number(value) <= maximum
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
      || value.version !== PERSISTED_DATA_EXPORT_VERSION) {
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
    ...(selected.has("boards") && data.boards !== undefined ? { boards: data.boards } : {}),
    ...(selected.has("instances") && data.instances !== undefined ? { instances: data.instances } : {}),
  }
}

export function hasPersistedUserDataSlice(
  data: Partial<PersistedUserData>,
  sliceId: PersistedPortableSliceId,
): boolean {
  if (sliceId === "settings") return data.settings !== undefined
  if (sliceId === "instances") return data.instances !== undefined
  return data.boards !== undefined
}

export function mergePersistedUserData(
  current: PersistedUserData,
  imported: Partial<PersistedUserData>,
): PersistedUserData {
  return normalizePersistedUserData({
    version: APPLICATION_DATA_VERSION,
    settings: imported.settings ?? current.settings,
    boards: imported.boards ?? current.boards,
    instances: imported.instances ?? current.instances,
  })
}

export function normalizePersistedUserData(data: PersistedUserData): PersistedUserData {
  const application = ensureApplicationDataIntegrity(normalizeApplicationData(data))
  const boardIds = new Set(application.boards.map(board => board.id))
  const settings = normalizePersistedSettings(data.settings)
  if (settings.general.defaultBoardId !== null
    && !boardIds.has(settings.general.defaultBoardId)) {
    settings.general.defaultBoardId = application.boards[0]?.id ?? null
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
  const boards = Object.hasOwn(data, "boards")
    ? normalizeBoards(data.boards, instanceIds)
    : undefined
  return {
    ...((boards || hasInstances) ? { version: APPLICATION_DATA_VERSION } : {}),
    ...(Object.hasOwn(data, "settings") ? { settings: normalizePersistedSettings(data.settings) } : {}),
    ...(boards ? { boards } : {}),
    ...(hasInstances ? { instances } : {}),
  }
}

function normalizeBoardIdentity(
  candidate: unknown,
  seenIds: Set<string>,
  seenNames: string[],
): Pick<Board, "createdAt" | "id" | "name"> | undefined {
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
