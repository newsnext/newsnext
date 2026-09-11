import type { ApplicationData } from "../application/data"
import type {
  Board,
  LiveWidget,
  LiveWidgetDataScope,
  NowLayerAutomaticSortMode,
  NowLayerSortMode,
} from "../board"
import type { LiveCard, LiveCardPatch } from "../source"
import type { PersistedSettings } from "./persisted-settings"
import { isThemeColor, parseWidgetChartOptions } from "@newsnext/sdk/models"
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

export const PERSISTED_DATA_EXPORT_VERSION = 5
export const PERSISTED_DATA_EXPORT_KIND = "newsnext-user-data"
export const PERSISTED_PORTABLE_SLICE_IDS = [
  "settings",
  "boards",
  "liveCards",
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
  if (!isRecord(value) || value.version !== APPLICATION_DATA_VERSION) {
    return createEmptyApplicationData()
  }

  const liveCards = normalizeLiveCards(value.liveCards)
  const cardIds = new Set(liveCards.map(card => card.cardId))
  const boards = normalizeBoards(value.boards, cardIds)

  return {
    version: APPLICATION_DATA_VERSION,
    boards,
    liveCards,
  }
}

export function normalizeBoards(
  value: unknown,
  cardIds?: ReadonlySet<string>,
): Board[] {
  if (!Array.isArray(value)) return []
  const seenIds = new Set<string>()
  const seenNames: string[] = []
  const assignedCardIds = new Set<string>()
  return value.flatMap((candidate) => {
    const identity = normalizeBoardIdentity(candidate, seenIds, seenNames)
    if (!identity || !isRecord(candidate)) return []

    const ids = normalizeIdentifierArray(candidate.cardIds, cardIds).filter((cardId) => {
      if (assignedCardIds.has(cardId)) return false
      assignedCardIds.add(cardId)
      return true
    })
    const nowLayer = isRecord(candidate.nowLayer) ? candidate.nowLayer : {}
    const nextLayer = isRecord(candidate.nextLayer) ? candidate.nextLayer : {}
    const sortValue = isRecord(nowLayer.sort) ? nowLayer.sort : {}
    const mode = normalizeNowLayerSortMode(sortValue.mode)
    const automaticMode = normalizeNowLayerAutomaticSortMode(sortValue.automaticMode)
    return [{
      ...identity,
      color: isThemeColor(candidate.color) ? candidate.color : DEFAULT_BOARD_COLOR,
      defaultLayer: normalizeBoardLayer(candidate.defaultLayer),
      cardIds: ids,
      nowLayer: {
        sort: {
          mode,
          automaticMode: mode === "manual" ? automaticMode : mode,
          manualOrder: reconcileOrder(
            normalizeIdentifierArray(sortValue.manualOrder, cardIds),
            ids,
          ),
        },
      },
      nextLayer: {
        liveWidgets: normalizeLiveWidgets(nextLayer.liveWidgets, new Set(ids)),
      },
    }]
  })
}

function normalizeLiveWidgets(
  value: unknown,
  boardCardIds: ReadonlySet<string>,
): LiveWidget[] {
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
    const dataScope = normalizeWidgetDataScope(candidate.dataScope, boardCardIds)
    if (!dataScope) return []
    const patch = isRecord(candidate.patch) ? candidate.patch : candidate
    let view
    try {
      view = patch.view === undefined ? undefined : parseWidgetChartOptions(patch.view, true)
    } catch {
      view = undefined
    }
    seen.add(candidate.widgetId)
    return [{
      dataScope,
      layout: {
        height: layout.height,
        width: layout.width,
        x: layout.x,
        y: layout.y,
      },
      ...((patch.metadata || patch.params || view)
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
            ...(view ? { view } : {}),
          } }
        : {}),
      widgetId: candidate.widgetId,
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
  const includesApplicationData = selected.has("boards") || selected.has("liveCards")
  return {
    ...(includesApplicationData ? { version: APPLICATION_DATA_VERSION } : {}),
    ...(selected.has("settings") && data.settings !== undefined ? { settings: data.settings } : {}),
    ...(selected.has("boards") && data.boards !== undefined ? { boards: data.boards } : {}),
    ...(selected.has("liveCards") && data.liveCards !== undefined ? { liveCards: data.liveCards } : {}),
  }
}

export function hasPersistedUserDataSlice(
  data: Partial<PersistedUserData>,
  sliceId: PersistedPortableSliceId,
): boolean {
  if (sliceId === "settings") return data.settings !== undefined
  if (sliceId === "liveCards") return data.liveCards !== undefined
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
    liveCards: imported.liveCards ?? current.liveCards,
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
  const hasLiveCards = Object.hasOwn(data, "liveCards")
  const hasBoards = Object.hasOwn(data, "boards")
  if ((hasBoards || hasLiveCards) && data.version !== APPLICATION_DATA_VERSION) {
    return {}
  }
  const liveCards = normalizeLiveCards(data.liveCards)
  const cardIds = hasLiveCards
    ? new Set(liveCards.map(card => card.cardId))
    : undefined
  const boards = hasBoards
    ? normalizeBoards(data.boards, cardIds)
    : undefined
  return {
    ...((boards || hasLiveCards) ? { version: APPLICATION_DATA_VERSION } : {}),
    ...(Object.hasOwn(data, "settings") ? { settings: normalizePersistedSettings(data.settings) } : {}),
    ...(boards ? { boards } : {}),
    ...(hasLiveCards ? { liveCards } : {}),
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

function reconcileOrder(order: string[], cardIds: string[]): string[] {
  const cardIdSet = new Set(cardIds)
  const ordered = order.filter(cardId => cardIdSet.has(cardId))
  const orderedSet = new Set(ordered)
  return [...ordered, ...cardIds.filter(cardId => !orderedSet.has(cardId))]
}

function normalizeNowLayerSortMode(value: unknown): NowLayerSortMode {
  return value === "provider" || value === "manual"
    ? value
    : DEFAULT_NOW_LAYER_SORT.mode
}

function normalizeNowLayerAutomaticSortMode(value: unknown): NowLayerAutomaticSortMode {
  return value === "provider" ? value : DEFAULT_NOW_LAYER_SORT.automaticMode
}

function isLiveCardPatch(value: unknown): value is LiveCardPatch {
  return isRecord(value)
    && (value.params === undefined || isRecord(value.params))
    && (value.metadata === undefined || isRecord(value.metadata))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}
