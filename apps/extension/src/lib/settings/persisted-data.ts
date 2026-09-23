import type { SourceProvider } from "@newsnext/sdk/models"
import type { ApplicationData } from "../application/data"
import type { LiveWidgetDataScope } from "../board"
import type { LiveCardPatch } from "../source"
import type { PersistedSettings } from "./persisted-settings"
import { CATEGORY_IDS, isThemeColor, MIN_WIDGET_WIDTH } from "@newsnext/sdk/models"
import {
  APPLICATION_DATA_VERSION,
  createEmptyApplicationData,
  ensureApplicationDataIntegrity,
} from "../application/data"
import { normalizeBoardLayer } from "../board"
import { normalizePersistedSettings } from "./persisted-settings"

export const PERSISTED_DATA_EXPORT_VERSION = 8
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
  if (!isRecord(value) || value.version !== APPLICATION_DATA_VERSION) {
    throw new Error("Unsupported Application data version; stored data must be preserved until a compatible version is available")
  }
  return normalizeCurrentApplicationData(value)
}

function normalizeCurrentApplicationData(value: Record<string, unknown>): ApplicationData {
  if (!Array.isArray(value.boardOrder) || !isRecord(value.boards) || !isRecord(value.liveCards) || !isRecord(value.liveWidgets)) {
    throw new TypeError("Invalid Application data; refusing to replace stored entity maps with empty data")
  }
  const liveCards: ApplicationData["liveCards"] = {}
  for (const [cardId, candidate] of Object.entries(value.liveCards)) {
    if (!cardId || !isRecord(candidate)) continue
    const card = normalizeLiveCard({ ...candidate, cardId })
    if (!card) continue
    const { cardId: _cardId, ...stored } = card
    liveCards[cardId] = stored
  }
  const liveWidgets: ApplicationData["liveWidgets"] = {}
  for (const [liveWidgetId, candidate] of Object.entries(value.liveWidgets)) {
    if (!liveWidgetId || !isRecord(candidate)) continue
    const widget = normalizeLiveWidget({ ...candidate, liveWidgetId }, new Set(Object.keys(liveCards)))
    if (!widget) continue
    const { liveWidgetId: _liveWidgetId, ...stored } = widget
    liveWidgets[liveWidgetId] = stored
  }
  const boards: ApplicationData["boards"] = {}
  const assignedCards = new Set<string>()
  const assignedWidgets = new Set<string>()
  for (const [boardId, candidate] of Object.entries(value.boards)) {
    if (!boardId || !isRecord(candidate) || typeof candidate.name !== "string" || !candidate.name.trim()
      || typeof candidate.createdAt !== "number" || !Number.isFinite(candidate.createdAt) || !isThemeColor(candidate.color)) {
      continue
    }
    const nowLayer = isRecord(candidate.nowLayer) ? candidate.nowLayer : {}
    const cardIds = normalizeIdentifierArray(nowLayer.liveCards, new Set(Object.keys(liveCards))).filter((id) => {
      if (assignedCards.has(id)) return false
      assignedCards.add(id)
      return true
    })
    const nextLayer = isRecord(candidate.nextLayer) ? candidate.nextLayer : {}
    const widgetIds = normalizeIdentifierArray(nextLayer.liveWidgets, new Set(Object.keys(liveWidgets))).filter((id) => {
      if (assignedWidgets.has(id)) return false
      const scope = liveWidgets[id]!.dataScope
      if (scope.type === "cards" && scope.cardIds.some(cardId => !cardIds.includes(cardId))) return false
      assignedWidgets.add(id)
      return true
    })
    boards[boardId] = {
      color: candidate.color,
      createdAt: candidate.createdAt,
      layer: normalizeBoardLayer(candidate.layer),
      name: candidate.name.trim(),
      nowLayer: { liveCards: cardIds },
      nextLayer: { liveWidgets: widgetIds },
    }
  }
  const boardOrder = normalizeIdentifierArray(value.boardOrder, new Set(Object.keys(boards)))
  for (const boardId of Object.keys(boards)) {
    if (!boardOrder.includes(boardId)) boardOrder.push(boardId)
  }
  for (const cardId of Object.keys(liveCards)) {
    if (!assignedCards.has(cardId)) delete liveCards[cardId]
  }
  for (const widgetId of Object.keys(liveWidgets)) {
    if (!assignedWidgets.has(widgetId)) delete liveWidgets[widgetId]
  }
  return { version: APPLICATION_DATA_VERSION, boardOrder, boards, liveCards, liveWidgets }
}

function normalizeLiveWidget(
  candidate: unknown,
  boardCardIds: ReadonlySet<string>,
): (ApplicationData["liveWidgets"][string] & { liveWidgetId: string }) | undefined {
  if (!isRecord(candidate)
    || typeof candidate.liveWidgetId !== "string"
    || candidate.liveWidgetId.trim().length === 0
    || typeof candidate.widgetId !== "string"
    || candidate.widgetId.trim().length === 0
    || !/^[\w-]+$/.test(candidate.widgetId)
    || !isRecord(candidate.layout)) {
    return undefined
  }
  const layout = candidate.layout
  if (!isIntegerBetween(layout.width, 1, 12)
    || !isIntegerBetween(layout.height, 1, 100)) {
    return undefined
  }
  const dataScope = normalizeWidgetDataScope(candidate.dataScope, boardCardIds)
  if (!dataScope) return undefined
  const patch = isRecord(candidate.patch) ? candidate.patch : {}
  return {
    dataScope,
    layout: {
      height: layout.height,
      width: Math.max(MIN_WIDGET_WIDTH, layout.width),
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
  }
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

function normalizeLiveCard(candidate: unknown): (ApplicationData["liveCards"][string] & { cardId: string }) | undefined {
  if (!isRecord(candidate)
    || typeof candidate.cardId !== "string"
    || candidate.cardId.trim().length === 0
    || typeof candidate.workerId !== "string"
    || candidate.workerId.trim().length === 0
    || typeof candidate.sourceId !== "string"
    || candidate.sourceId.trim().length === 0
    || typeof candidate.createdAt !== "number"
    || !Number.isFinite(candidate.createdAt)
    || !isLiveCardPatch(candidate.patch)) {
    return undefined
  }
  return {
    cardId: candidate.cardId,
    workerId: candidate.workerId,
    sourceId: candidate.sourceId,
    provider: normalizeSourceProvider(candidate.provider, candidate.sourceId),
    patch: candidate.patch,
    createdAt: candidate.createdAt,
  }
}

function normalizeSourceProvider(
  value: unknown,
  sourceId: string,
): SourceProvider {
  const fallbackTitle = sourceId.split(":", 1)[0] || sourceId
  if (!isRecord(value)
    || typeof value.title !== "string"
    || !value.title.trim()
    || !isThemeColor(value.color)) {
    return { color: "slate", title: fallbackTitle }
  }
  return {
    color: value.color,
    title: value.title.trim(),
    ...(typeof value.icon === "string" ? { icon: value.icon } : {}),
    ...(typeof value.category === "string" && CATEGORY_IDS.includes(value.category as typeof CATEGORY_IDS[number])
      ? { category: value.category as typeof CATEGORY_IDS[number] }
      : {}),
  }
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
    ...(selected.has("boards") && data.boardOrder !== undefined ? { boardOrder: data.boardOrder } : {}),
    ...(selected.has("settings") && data.settings !== undefined ? { settings: data.settings } : {}),
    ...(selected.has("boards") && data.boards !== undefined ? { boards: data.boards } : {}),
    ...(selected.has("boards") && data.liveCards !== undefined ? { liveCards: data.liveCards } : {}),
    ...(selected.has("boards") && data.liveWidgets !== undefined ? { liveWidgets: data.liveWidgets } : {}),
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
    boardOrder: imported.boardOrder ?? current.boardOrder,
    boards: imported.boards ?? current.boards,
    liveCards: imported.liveCards ?? current.liveCards,
    liveWidgets: imported.liveWidgets ?? current.liveWidgets,
  })
}

export function normalizePersistedUserData(data: PersistedUserData): PersistedUserData {
  const application = ensureApplicationDataIntegrity(normalizeApplicationData(data))
  const boardIds = new Set(Object.keys(application.boards))
  const settings = normalizePersistedSettings(data.settings)
  if (settings.general.defaultBoardId !== null
    && !boardIds.has(settings.general.defaultBoardId)) {
    settings.general.defaultBoardId = application.boardOrder[0] ?? null
  }
  return { ...application, settings }
}

function normalizePartialPersistedUserData(
  value: unknown,
): Partial<PersistedUserData> {
  if (!isRecord(value)) return {}
  const data = value
  const hasApplication = Object.hasOwn(data, "boards") || Object.hasOwn(data, "liveCards") || Object.hasOwn(data, "liveWidgets")
  const application = hasApplication ? normalizeApplicationData(data) : undefined
  return {
    ...(application ?? {}),
    ...(Object.hasOwn(data, "settings") ? { settings: normalizePersistedSettings(data.settings) } : {}),
  }
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
