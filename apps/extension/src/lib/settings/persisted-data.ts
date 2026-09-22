import type { ApplicationData } from "../application/data"
import type {
  Board,
  LiveWidget,
  LiveWidgetDataScope,
} from "../board"
import type { LiveCard, LiveCardPatch } from "../source"
import type { PersistedSettings } from "./persisted-settings"
import { isThemeColor } from "@newsnext/sdk/models"
import {
  APPLICATION_DATA_VERSION,
  createEmptyApplicationData,
  ensureApplicationDataIntegrity,
} from "../application/data"
import {
  DEFAULT_BOARD_COLOR,
  normalizeBoardLayer,
} from "../board"
import { normalizePersistedSettings } from "./persisted-settings"

export const PERSISTED_DATA_EXPORT_VERSION = 7
export const PERSISTED_DATA_EXPORT_KIND = "newsnext-user-data"
export const PERSISTED_PORTABLE_SLICE_IDS = [
  "settings",
  "boards",
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
    key: "newsnext-source-secrets",
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
  if (value === undefined) return createEmptyApplicationData()
  if (!isRecord(value) || (value.version !== APPLICATION_DATA_VERSION && value.version !== 8)) {
    throw new Error("Unsupported Application data version; stored data must be preserved until a compatible version is available")
  }
  if (!Array.isArray(value.boards)) {
    throw new TypeError("Invalid Application data; refusing to replace stored Boards with empty data")
  }
  if (value.version === 8 && !Array.isArray(value.liveCards)) {
    throw new TypeError("Invalid Application data; refusing to migrate stored LiveCards as empty data")
  }
  const legacyCards = value.version === 8
    ? new Map(normalizeLiveCards(value.liveCards).map(card => [card.cardId, card]))
    : undefined
  const boards = normalizeBoards(value.boards, legacyCards)
  if (legacyCards && boards.length > 0) {
    const assigned = new Set(boards.flatMap(board => board.nowLayer.liveCards.map(card => card.cardId)))
    const unassigned = [...legacyCards.values()]
      .filter(card => !assigned.has(card.cardId))
      .toSorted((left, right) => right.createdAt - left.createdAt || left.cardId.localeCompare(right.cardId))
    if (unassigned.length > 0) boards[0]!.nowLayer.liveCards.unshift(...unassigned)
  }
  return {
    version: APPLICATION_DATA_VERSION,
    boards,
  }
}

export function normalizeBoards(
  value: unknown,
  legacyCards?: ReadonlyMap<string, LiveCard>,
): Board[] {
  if (!Array.isArray(value)) return []
  const seenIds = new Set<string>()
  const seenNames: string[] = []
  const assignedCardIds = new Set<string>()
  const assignedLiveWidgetIds = new Set<string>()
  return value.flatMap((candidate) => {
    const identity = normalizeBoardIdentity(candidate, seenIds, seenNames)
    if (!identity || !isRecord(candidate)) return []

    const nowLayer = isRecord(candidate.nowLayer) ? candidate.nowLayer : {}
    const cards = (legacyCards
      ? normalizeIdentifierArray(nowLayer.liveCards, new Set(legacyCards.keys())).flatMap(cardId => legacyCards.get(cardId) ?? [])
      : normalizeLiveCards(nowLayer.liveCards)).filter((card) => {
      if (assignedCardIds.has(card.cardId)) return false
      assignedCardIds.add(card.cardId)
      return true
    })
    const cardIds = new Set(cards.map(card => card.cardId))
    const nextLayer = isRecord(candidate.nextLayer) ? candidate.nextLayer : {}
    return [{
      ...identity,
      color: isThemeColor(candidate.color) ? candidate.color : DEFAULT_BOARD_COLOR,
      layer: normalizeBoardLayer(candidate.layer),
      nowLayer: { liveCards: cards },
      nextLayer: {
        liveWidgets: normalizeLiveWidgets(nextLayer.liveWidgets, cardIds, assignedLiveWidgetIds),
      },
    }]
  })
}

function normalizeLiveWidgets(
  value: unknown,
  boardCardIds: ReadonlySet<string>,
  seen: Set<string>,
): LiveWidget[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((candidate) => {
    if (!isRecord(candidate)
      || typeof candidate.liveWidgetId !== "string"
      || candidate.liveWidgetId.trim().length === 0
      || typeof candidate.widgetId !== "string"
      || candidate.widgetId.trim().length === 0
      || !/^[\w-]+$/.test(candidate.widgetId)
      || seen.has(candidate.liveWidgetId)
      || !isRecord(candidate.layout)) {
      return []
    }
    const layout = candidate.layout
    if (!isIntegerBetween(layout.width, 1, 12)
      || !isIntegerBetween(layout.height, 1, 100)) {
      return []
    }
    const dataScope = normalizeWidgetDataScope(candidate.dataScope, boardCardIds)
    if (!dataScope) return []
    const patch = isRecord(candidate.patch) ? candidate.patch : {}
    seen.add(candidate.liveWidgetId)
    return [{
      dataScope,
      layout: {
        height: layout.height,
        width: layout.width,
      },
      ...((patch.metadata || patch.params)
        ? { patch: {
            ...(isRecord(patch.metadata)
              ? {
                  metadata: {
                    ...(typeof patch.metadata.badge === "string" ? { badge: patch.metadata.badge } : {}),
                    ...(typeof patch.metadata.desc === "string" ? { desc: patch.metadata.desc } : {}),
                    ...(typeof patch.metadata.home === "string" ? { home: patch.metadata.home } : {}),
                    ...(typeof patch.metadata.title === "string" && patch.metadata.title.trim()
                      ? { title: patch.metadata.title.trim() }
                      : {}),
                    ...(isThemeColor(patch.metadata.color) ? { color: patch.metadata.color } : {}),
                  },
                }
              : {}),
            ...(isRecord(patch.params) ? { params: patch.params } : {}),
          } }
        : {}),
      widgetId: candidate.widgetId,
      liveWidgetId: candidate.liveWidgetId,
    }]
  })
}

function normalizeWidgetDataScope(
  value: unknown,
  boardCardIds: ReadonlySet<string>,
): LiveWidgetDataScope | undefined {
  if (!isRecord(value) || typeof value.type !== "string") return undefined
  if (value.type === "board") return { type: "board" }
  if (value.type !== "cards") return undefined
  return {
    type: "cards",
    cardIds: normalizeIdentifierArray(value.cardIds, boardCardIds),
  }
}

function isIntegerBetween(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isInteger(value) && Number(value) >= minimum && Number(value) <= maximum
}

export function normalizeLiveCards(value: unknown): LiveCard[] {
  if (!Array.isArray(value)) return []
  const seenIds = new Set<string>()
  return value.flatMap((candidate) => {
    if (!isRecord(candidate)
      || typeof candidate.cardId !== "string"
      || candidate.cardId.trim().length === 0
      || typeof candidate.workerId !== "string"
      || candidate.workerId.trim().length === 0
      || typeof candidate.sourceId !== "string"
      || candidate.sourceId.trim().length === 0
      || typeof candidate.createdAt !== "number"
      || !Number.isFinite(candidate.createdAt)
      || !isLiveCardPatch(candidate.patch)
      || seenIds.has(candidate.cardId)) {
      return []
    }
    seenIds.add(candidate.cardId)
    return [{
      cardId: candidate.cardId,
      workerId: candidate.workerId,
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
  const includesApplicationData = selected.has("boards")
  return {
    ...(includesApplicationData ? { version: APPLICATION_DATA_VERSION } : {}),
    ...(selected.has("settings") && data.settings !== undefined ? { settings: data.settings } : {}),
    ...(selected.has("boards") && data.boards !== undefined ? { boards: data.boards } : {}),
  }
}

export function hasPersistedUserDataSlice(
  data: Partial<PersistedUserData>,
  sliceId: PersistedPortableSliceId,
): boolean {
  if (sliceId === "settings") return data.settings !== undefined
  return data.boards !== undefined
}

export function mergePersistedUserData(
  current: PersistedUserData,
  imported: Partial<PersistedUserData>,
): PersistedUserData {
  const settings = imported.settings
    ? normalizePersistedSettings(imported.settings)
    : current.settings
  return normalizePersistedUserData({
    version: APPLICATION_DATA_VERSION,
    settings,
    boards: imported.boards ?? current.boards,
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
  value: unknown,
): Partial<PersistedUserData> {
  if (!isRecord(value)) return {}
  const data = value
  const hasBoards = Object.hasOwn(data, "boards")
  if (hasBoards && data.version !== APPLICATION_DATA_VERSION) {
    return {}
  }
  const boards = hasBoards
    ? normalizeBoards(data.boards)
    : undefined
  return {
    ...(boards ? { version: APPLICATION_DATA_VERSION } : {}),
    ...(Object.hasOwn(data, "settings") ? { settings: normalizePersistedSettings(data.settings) } : {}),
    ...(boards ? { boards } : {}),
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

function isLiveCardPatch(value: unknown): value is LiveCardPatch {
  return isRecord(value)
    && (value.params === undefined || isRecord(value.params))
    && (value.metadata === undefined || isRecord(value.metadata))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}
