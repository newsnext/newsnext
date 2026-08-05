import type { Color } from "@newsnext/shared/types"
import type { BoardSortPreference } from "./board-sorting"
import type { Board } from "./boards"
import type { PersistedSettings } from "./persisted-settings"
import type { SourceInstance, SourceInstancePatch } from "./source-cards"
import { COLORS } from "@newsnext/shared/constants"
import { normalizeBoardFilter } from "./board-filter"
import { createBoardSortPreference } from "./board-sorting"
import { ALL_BOARD_ID, ALL_BOARD_NAME } from "./boards"
import { normalizePersistedSettings } from "./persisted-settings"

export const PERSISTED_DATA_EXPORT_VERSION = 1
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
  boards: {
    key: "newsnext-board-items",
    scope: "portable",
  },
  instances: {
    key: "newsnext-source-instances",
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

export interface PersistedUserData {
  boards: Board[]
  instances: SourceInstance[]
  settings: PersistedSettings
}

export interface PersistedDataExport {
  data: Partial<PersistedUserData>
  kind: typeof PERSISTED_DATA_EXPORT_KIND
  version: typeof PERSISTED_DATA_EXPORT_VERSION
}

export function createDefaultBoards(): Board[] {
  return [{
    id: ALL_BOARD_ID,
    name: ALL_BOARD_NAME,
    sort: createBoardSortPreference(),
  }]
}

export function normalizeBoards(value: unknown): Board[] {
  if (!Array.isArray(value)) {
    return createDefaultBoards()
  }

  const seenIds = new Set<string>()
  const boards = value.flatMap((candidate) => {
    if (
      !isRecord(candidate)
      || typeof candidate.id !== "string"
      || typeof candidate.name !== "string"
    ) {
      return []
    }

    if (seenIds.has(candidate.id)) {
      return []
    }
    seenIds.add(candidate.id)
    const filter = normalizeBoardFilter(candidate.filter)
    return [{
      id: candidate.id,
      name: candidate.name,
      sort: normalizeBoardSortPreference(candidate.sort),
      ...(isColor(candidate.color) ? { color: candidate.color } : {}),
      ...(filter ? { filter } : {}),
    }]
  })

  if (!seenIds.has(ALL_BOARD_ID)) {
    boards.unshift(...createDefaultBoards())
  }
  return boards
}

export function normalizeSourceInstances(value: unknown): SourceInstance[] {
  if (!Array.isArray(value)) {
    return []
  }

  const seenIds = new Set<string>()
  return value.flatMap((candidate) => {
    if (!isRecord(candidate)
      || typeof candidate.instanceId !== "string"
      || typeof candidate.sourceId !== "string"
      || !(typeof candidate.boardId === "string" || candidate.boardId === null)
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
      boardId: candidate.boardId,
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

export function parsePersistedDataExport(
  serialized: string,
): PersistedDataExport | undefined {
  try {
    const value: unknown = JSON.parse(serialized)
    if (!isRecord(value)
      || value.kind !== PERSISTED_DATA_EXPORT_KIND
      || value.version !== PERSISTED_DATA_EXPORT_VERSION
      || !isRecord(value.data)) {
      return undefined
    }

    const data = normalizePartialPersistedUserData(value.data)
    if (Object.keys(data).length === 0) {
      return undefined
    }

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
    ...(selected.has("settings") && data.settings !== undefined
      ? { settings: data.settings }
      : {}),
    ...(selected.has("boards") && data.boards !== undefined
      ? { boards: data.boards }
      : {}),
    ...(selected.has("instances") && data.instances !== undefined
      ? { instances: data.instances }
      : {}),
  }
}

export function mergePersistedUserData(
  current: PersistedUserData,
  imported: Partial<PersistedUserData>,
): PersistedUserData {
  return normalizePersistedUserData({
    settings: imported.settings ?? current.settings,
    boards: imported.boards ?? current.boards,
    instances: imported.instances ?? current.instances,
  })
}

export function normalizePersistedUserData(
  data: PersistedUserData,
): PersistedUserData {
  const boards = normalizeBoards(data.boards)
  const boardIds = new Set(boards.map(board => board.id))
  const instances = normalizeSourceInstances(data.instances).map(instance => (
    instance.boardId === null || boardIds.has(instance.boardId)
      ? instance
      : { ...instance, boardId: null }
  ))
  const instancesById = new Map(instances.map(instance => [instance.instanceId, instance]))
  const settings = normalizePersistedSettings(data.settings)
  if (settings.general.defaultBoardId !== null
    && !boardIds.has(settings.general.defaultBoardId)) {
    settings.general.defaultBoardId = ALL_BOARD_ID
  }

  return {
    settings,
    boards: boards.map(board => ({
      ...board,
      sort: {
        ...board.sort,
        manualOrder: board.sort.manualOrder.filter((id) => {
          const instance = instancesById.get(id)
          return instance !== undefined
            && (board.id === ALL_BOARD_ID || instance.boardId === board.id)
        }),
      },
    })),
    instances,
  }
}

function normalizePartialPersistedUserData(
  data: Record<string, unknown>,
): Partial<PersistedUserData> {
  return {
    ...(Object.hasOwn(data, "settings")
      ? { settings: normalizePersistedSettings(data.settings) }
      : {}),
    ...(Object.hasOwn(data, "boards")
      ? { boards: normalizeBoards(data.boards) }
      : {}),
    ...(Object.hasOwn(data, "instances")
      ? { instances: normalizeSourceInstances(data.instances) }
      : {}),
  }
}

function isBoardSortPreference(value: unknown): value is BoardSortPreference {
  if (!isRecord(value)
    || !isBoardSortMode(value.mode)
    || !isAutomaticBoardSortMode(value.automaticMode)
    || !Array.isArray(value.manualOrder)) {
    return false
  }
  return value.manualOrder.every(id => typeof id === "string")
}

function normalizeBoardSortPreference(
  value: unknown,
): BoardSortPreference {
  if (isBoardSortPreference(value)) {
    return {
      ...value,
      manualOrder: [...value.manualOrder],
    }
  }
  return createBoardSortPreference()
}

function isSourceInstancePatch(value: unknown): value is SourceInstancePatch {
  if (!isRecord(value)) {
    return false
  }
  return (value.params === undefined || isRecord(value.params))
    && (value.metadata === undefined || isRecord(value.metadata))
}

function isBoardSortMode(value: unknown): boolean {
  return value === "createdAt" || value === "provider" || value === "manual"
}

function isAutomaticBoardSortMode(value: unknown): boolean {
  return value === "createdAt" || value === "provider"
}

function isColor(value: unknown): value is Color {
  return typeof value === "string" && COLORS.includes(value as Color)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}
