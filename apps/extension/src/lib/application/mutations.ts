import type { BoardDeleteInput, LiveWidgetInstallSize, SourceProvider, StoredLiveCard, StoredLiveWidget, WidgetMetadata } from "@newsnext/sdk/models"
import type { Color } from "@newsnext/shared/types"
import type { BoardLayer, LiveWidgetDataScope, LiveWidgetLayout } from "../board"
import type { LiveCardPatch } from "../source/live-cards"
import type { ApplicationData } from "./data"
import { MIN_WIDGET_WIDTH } from "@newsnext/sdk/models"
import { DEFAULT_BOARD_COLOR, DEFAULT_BOARD_LAYER } from "../board"
import { mergeLiveCardPatch } from "../source/live-cards"

export interface BoardConfiguration {
  color?: Color
  layer?: BoardLayer
}

interface ApplicationLiveCardCreationInput {
  patch: LiveCardPatch
  provider: SourceProvider
  sourceId: string
}

export type { BoardDeleteInput } from "@newsnext/sdk/models"

export interface ApplicationMutationDependencies {
  createId: () => string
  now: () => number
  workerId: string
}

export interface ApplicationMutationExecution {
  data: ApplicationData
  result?: ApplicationMutationResult
}

export interface ApplicationMutationResult {
  boardId?: string
  cardId?: string
  liveWidgetId?: string
}

export function createBoardMutation(data: ApplicationData, input: BoardConfiguration & {
  liveCards?: ApplicationLiveCardCreationInput[]
  name: string
}, dependencies: ApplicationMutationDependencies): ApplicationMutationExecution {
  const name = input.name.trim()
  assertBoardName(name)
  const boardId = dependencies.createId()
  if (!boardId || data.boards[boardId]) throw new Error("Board ID must be unique")
  let nextData: ApplicationData = {
    ...data,
    boardOrder: [...data.boardOrder, boardId],
    boards: {
      ...data.boards,
      [boardId]: {
        color: input.color ?? DEFAULT_BOARD_COLOR,
        createdAt: dependencies.now(),
        layer: input.layer ?? DEFAULT_BOARD_LAYER,
        name,
        nowLayer: { liveCards: [] },
        nextLayer: { liveWidgets: [] },
      },
    },
  }
  for (const card of input.liveCards ?? []) {
    nextData = createLiveCardMutation(nextData, { ...card, boardId }, dependencies).data
  }
  return { data: nextData, result: { boardId } }
}

export function updateBoardMutation(data: ApplicationData, input: BoardConfiguration & { boardId: string, name?: string }): ApplicationMutationExecution {
  const board = getBoard(data, input.boardId)
  if (input.name === undefined && input.color === undefined && input.layer === undefined) throw new Error("Board update requires at least one change")
  const name = input.name?.trim()
  if (name !== undefined) assertBoardName(name)
  return replaceBoard(data, input.boardId, {
    ...board,
    ...(name !== undefined ? { name } : {}),
    ...(input.color !== undefined ? { color: input.color } : {}),
    ...(input.layer !== undefined ? { layer: input.layer } : {}),
  })
}

export function deleteBoardMutation(data: ApplicationData, input: BoardDeleteInput): ApplicationMutationExecution {
  const source = getBoard(data, input.boardId)
  if (data.boardOrder.length === 1) throw new Error("NewsNext must keep at least one Board")
  if (input.deleteLiveCards !== true) {
    if (!input.targetBoardId) throw new Error("Board deletion requires a transfer target")
    if (input.targetBoardId === input.boardId) throw new Error("Board transfer target must differ from the deleted Board")
    getBoard(data, input.targetBoardId)
  }
  const boards = { ...data.boards }
  delete boards[input.boardId]
  const liveCards = { ...data.liveCards }
  const liveWidgets = { ...data.liveWidgets }
  if (input.deleteLiveCards === true) {
    source.nowLayer.liveCards.forEach(cardId => delete liveCards[cardId])
    source.nextLayer.liveWidgets.forEach(widgetId => delete liveWidgets[widgetId])
  } else {
    const targetId = input.targetBoardId!
    const target = boards[targetId]!
    boards[targetId] = {
      ...target,
      nowLayer: { liveCards: [...source.nowLayer.liveCards, ...target.nowLayer.liveCards] },
      nextLayer: { liveWidgets: [...source.nextLayer.liveWidgets, ...target.nextLayer.liveWidgets] },
    }
  }
  return { data: { ...data, boardOrder: data.boardOrder.filter(id => id !== input.boardId), boards, liveCards, liveWidgets } }
}

export function setNowLayerManualOrderMutation(data: ApplicationData, input: { boardId: string, liveCards: string[] }): ApplicationMutationExecution {
  const board = getBoard(data, input.boardId)
  assertCompleteOrder(board.nowLayer.liveCards, input.liveCards, "LiveCard")
  return replaceBoard(data, input.boardId, { ...board, nowLayer: { liveCards: [...input.liveCards] } })
}

export function setNextLayerManualOrderMutation(data: ApplicationData, input: { boardId: string, widgetIds: string[] }): ApplicationMutationExecution {
  const board = getBoard(data, input.boardId)
  assertCompleteOrder(board.nextLayer.liveWidgets, input.widgetIds, "Widget")
  return replaceBoard(data, input.boardId, { ...board, nextLayer: { liveWidgets: [...input.widgetIds] } })
}

export function createLiveWidgetMutation(data: ApplicationData, input: {
  boardId: string
  dataScope: LiveWidgetDataScope
  size: LiveWidgetInstallSize
  widgetId: string
}, dependencies: Pick<ApplicationMutationDependencies, "createId">): ApplicationMutationExecution {
  const board = getBoard(data, input.boardId)
  assertWidgetId(input.widgetId)
  assertWidgetDataScope(board.nowLayer.liveCards, input.dataScope)
  const layout = { height: input.size.height ?? 2, width: input.size.width ?? 2 }
  assertWidgetLayout(layout)
  const liveWidgetId = dependencies.createId()
  if (!liveWidgetId || data.liveWidgets[liveWidgetId]) throw new Error("LiveWidget instance ID must be unique")
  const widget: StoredLiveWidget = { dataScope: input.dataScope, layout, widgetId: input.widgetId }
  return {
    data: {
      ...data,
      boards: { ...data.boards, [input.boardId]: { ...board, nextLayer: { liveWidgets: [liveWidgetId, ...board.nextLayer.liveWidgets] } } },
      liveWidgets: { ...data.liveWidgets, [liveWidgetId]: widget },
    },
    result: { liveWidgetId },
  }
}

export function moveLiveWidgetMutation(data: ApplicationData, input: { boardId: string, liveWidgetId: string }): ApplicationMutationExecution {
  const target = getBoard(data, input.boardId)
  const sourceId = findWidgetBoardId(data, input.liveWidgetId)
  const widget = getLiveWidget(data, input.liveWidgetId)
  if (sourceId === input.boardId) return { data }
  const dataScope = widget.dataScope.type === "cards"
    ? { ...widget.dataScope, cardIds: widget.dataScope.cardIds.filter(id => target.nowLayer.liveCards.includes(id)) }
    : widget.dataScope
  return {
    data: {
      ...data,
      boards: moveLayerEntry(data.boards, sourceId, input.boardId, input.liveWidgetId, "liveWidgets"),
      liveWidgets: { ...data.liveWidgets, [input.liveWidgetId]: { ...widget, dataScope } },
    },
  }
}

export function deleteLiveWidgetMutation(data: ApplicationData, input: { liveWidgetId: string }): ApplicationMutationExecution {
  const boardId = findWidgetBoardId(data, input.liveWidgetId)
  const board = getBoard(data, boardId)
  const liveWidgets = { ...data.liveWidgets }
  delete liveWidgets[input.liveWidgetId]
  return { data: { ...data, boards: { ...data.boards, [boardId]: { ...board, nextLayer: { liveWidgets: board.nextLayer.liveWidgets.filter(id => id !== input.liveWidgetId) } } }, liveWidgets } }
}

export function configureLiveWidgetMutation(data: ApplicationData, input: { liveWidgetId: string, patch: { dataScope?: LiveWidgetDataScope | null, metadata?: WidgetMetadata | null, params?: Record<string, unknown> | null } }): ApplicationMutationExecution {
  const widget = getLiveWidget(data, input.liveWidgetId)
  const boardId = findWidgetBoardId(data, input.liveWidgetId)
  if (input.patch.dataScope) assertWidgetDataScope(getBoard(data, boardId).nowLayer.liveCards, input.patch.dataScope)
  const patch = { ...widget.patch }
  for (const key of ["params", "metadata"] as const) {
    const value = input.patch[key]
    if (value === null) {
      delete patch[key]
    } else if (value !== undefined) {
      const merged = { ...patch[key], ...value } as Record<string, unknown>
      if (key === "metadata" && typeof merged.title === "string") {
        const title = merged.title.trim()
        if (title) merged.title = title
        else delete merged.title
      }
      Object.assign(patch, { [key]: merged })
    }
  }
  const dataScope = input.patch.dataScope === null ? { type: "board" as const } : input.patch.dataScope ?? widget.dataScope
  return replaceLiveWidget(data, input.liveWidgetId, { ...widget, dataScope, patch })
}

export function setLiveWidgetLayoutsMutation(data: ApplicationData, input: { boardId: string, liveWidgets: Array<{ height: number, liveWidgetId: string, width: number }> }): ApplicationMutationExecution {
  const board = getBoard(data, input.boardId)
  if (input.liveWidgets.length === 0) throw new Error("At least one Widget layout is required")
  const ids = input.liveWidgets.map(value => value.liveWidgetId)
  assertCompleteOrder(board.nextLayer.liveWidgets, ids, "Widget")
  const liveWidgets = { ...data.liveWidgets }
  input.liveWidgets.forEach((update) => {
    const widget = getLiveWidget(data, update.liveWidgetId)
    const layout = { height: update.height, width: update.width }
    assertWidgetLayout(layout)
    liveWidgets[update.liveWidgetId] = { ...widget, layout }
  })
  return { data: { ...data, boards: { ...data.boards, [input.boardId]: { ...board, nextLayer: { liveWidgets: ids } } }, liveWidgets } }
}

export function resetLiveWidgetMetadataMutation(data: ApplicationData, input: { liveWidgetId: string }): ApplicationMutationExecution {
  const widget = getLiveWidget(data, input.liveWidgetId)
  return replaceLiveWidget(data, input.liveWidgetId, { ...widget, patch: { ...widget.patch, metadata: {} } })
}

export function resetLiveWidgetParamsMutation(data: ApplicationData, input: { liveWidgetId: string }): ApplicationMutationExecution {
  const widget = getLiveWidget(data, input.liveWidgetId)
  return replaceLiveWidget(data, input.liveWidgetId, { ...widget, patch: { ...widget.patch, params: {} } })
}

export function moveLiveCardMutation(data: ApplicationData, input: { boardId: string, cardId: string }): ApplicationMutationExecution {
  getBoard(data, input.boardId)
  getLiveCard(data, input.cardId)
  const sourceId = findCardBoardId(data, input.cardId)
  if (sourceId === input.boardId) return { data }
  return {
    data: {
      ...data,
      boards: moveLayerEntry(data.boards, sourceId, input.boardId, input.cardId, "liveCards"),
      liveWidgets: removeCardFromWidgetScopes(data.liveWidgets, input.cardId),
    },
  }
}

export function createLiveCardMutation(data: ApplicationData, input: ApplicationLiveCardCreationInput & { boardId: string }, dependencies: ApplicationMutationDependencies): ApplicationMutationExecution {
  const board = getBoard(data, input.boardId)
  if (!input.sourceId.trim()) throw new Error("Source ID is required")
  const cardId = dependencies.createId()
  if (!cardId || data.liveCards[cardId]) throw new Error(`LiveCard '${cardId}' already exists`)
  const card: StoredLiveCard = { createdAt: dependencies.now(), patch: input.patch, provider: input.provider, sourceId: input.sourceId, workerId: dependencies.workerId }
  return {
    data: {
      ...data,
      boards: { ...data.boards, [input.boardId]: { ...board, nowLayer: { liveCards: [cardId, ...board.nowLayer.liveCards] } } },
      liveCards: { ...data.liveCards, [cardId]: card },
    },
    result: { cardId },
  }
}

export function configureLiveCardMutation(data: ApplicationData, input: { cardId: string, patch: LiveCardPatch }): ApplicationMutationExecution {
  const card = getLiveCard(data, input.cardId)
  return replaceLiveCard(data, input.cardId, { ...card, patch: mergeLiveCardPatch(card.patch, input.patch) })
}

export function resetLiveCardMetadataMutation(data: ApplicationData, input: { cardId: string }): ApplicationMutationExecution {
  const card = getLiveCard(data, input.cardId)
  return replaceLiveCard(data, input.cardId, { ...card, patch: { ...card.patch, metadata: {} } })
}

export function resetLiveCardParamsMutation(data: ApplicationData, input: { cardId: string }): ApplicationMutationExecution {
  const card = getLiveCard(data, input.cardId)
  return replaceLiveCard(data, input.cardId, { ...card, patch: { ...card.patch, params: {} } })
}

export function deleteLiveCardMutation(data: ApplicationData, input: { cardId: string }): ApplicationMutationExecution {
  getLiveCard(data, input.cardId)
  const boardId = findCardBoardId(data, input.cardId)
  const board = getBoard(data, boardId)
  const liveCards = { ...data.liveCards }
  delete liveCards[input.cardId]
  const boards = { ...data.boards, [boardId]: { ...board, nowLayer: { liveCards: board.nowLayer.liveCards.filter(id => id !== input.cardId) } } }
  return { data: { ...data, boards, liveCards, liveWidgets: removeCardFromWidgetScopes(data.liveWidgets, input.cardId) } }
}

function getBoard(data: ApplicationData, id: string) {
  const value = data.boards[id]
  if (!value) throw new Error(`Board '${id}' not found`)
  return value
}

function getLiveCard(data: ApplicationData, id: string): StoredLiveCard {
  const value = data.liveCards[id]
  if (!value) throw new Error(`LiveCard '${id}' not found`)
  return value
}

function getLiveWidget(data: ApplicationData, id: string): StoredLiveWidget {
  const value = data.liveWidgets[id]
  if (!value) throw new Error(`LiveWidget '${id}' not found`)
  return value
}

function findCardBoardId(data: ApplicationData, cardId: string): string {
  const boardId = data.boardOrder.find(id => data.boards[id]?.nowLayer.liveCards.includes(cardId))
  if (!boardId) throw new Error(`LiveCard '${cardId}' is not assigned to a Board`)
  return boardId
}

function findWidgetBoardId(data: ApplicationData, widgetId: string): string {
  const boardId = data.boardOrder.find(id => data.boards[id]?.nextLayer.liveWidgets.includes(widgetId))
  if (!boardId) throw new Error(`LiveWidget '${widgetId}' is not assigned to a Board`)
  return boardId
}

function replaceBoard(data: ApplicationData, id: string, value: ApplicationData["boards"][string]): ApplicationMutationExecution {
  return { data: { ...data, boards: { ...data.boards, [id]: value } } }
}

function replaceLiveCard(data: ApplicationData, id: string, value: StoredLiveCard): ApplicationMutationExecution {
  return { data: { ...data, liveCards: { ...data.liveCards, [id]: value } } }
}

function replaceLiveWidget(data: ApplicationData, id: string, value: StoredLiveWidget): ApplicationMutationExecution {
  return { data: { ...data, liveWidgets: { ...data.liveWidgets, [id]: value } } }
}

function moveLayerEntry(boards: ApplicationData["boards"], sourceId: string, targetId: string, entryId: string, layer: "liveCards" | "liveWidgets"): ApplicationData["boards"] {
  const source = boards[sourceId]!
  const target = boards[targetId]!
  if (layer === "liveCards") {
    return {
      ...boards,
      [sourceId]: { ...source, nowLayer: { liveCards: source.nowLayer.liveCards.filter(id => id !== entryId) } },
      [targetId]: { ...target, nowLayer: { liveCards: [entryId, ...target.nowLayer.liveCards] } },
    }
  }
  return {
    ...boards,
    [sourceId]: { ...source, nextLayer: { liveWidgets: source.nextLayer.liveWidgets.filter(id => id !== entryId) } },
    [targetId]: { ...target, nextLayer: { liveWidgets: [entryId, ...target.nextLayer.liveWidgets] } },
  }
}

function removeCardFromWidgetScopes(widgets: ApplicationData["liveWidgets"], cardId: string): ApplicationData["liveWidgets"] {
  let changed = false
  const next = Object.fromEntries(Object.entries(widgets).map(([widgetId, widget]) => {
    if (widget.dataScope.type !== "cards" || !widget.dataScope.cardIds.includes(cardId)) return [widgetId, widget]
    changed = true
    return [widgetId, { ...widget, dataScope: { ...widget.dataScope, cardIds: widget.dataScope.cardIds.filter(id => id !== cardId) } }]
  }))
  return changed ? next : widgets
}

function assertCompleteOrder(existing: string[], requested: string[], label: string): void {
  const current = new Set(existing)
  const next = new Set(requested)
  if (next.size !== requested.length || next.size !== current.size || requested.some(id => !current.has(id))) {
    throw new Error(`Manual order must contain every Board ${label} exactly once`)
  }
}

function assertBoardName(name: string): void {
  if (!name) throw new Error("Board name is required")
}

function assertWidgetId(id: string): void {
  if (!id || !/^[\w-]+$/.test(id)) throw new Error("Widget ID must contain only letters, numbers, '-' or '_'")
}

function assertWidgetDataScope(boardCardIds: string[], scope: LiveWidgetDataScope): void {
  if (scope.type === "board") return
  if (new Set(scope.cardIds).size !== scope.cardIds.length || scope.cardIds.some(id => !boardCardIds.includes(id))) {
    throw new Error("Widget data scope must contain unique LiveCards from its Board")
  }
}

function assertWidgetLayout(layout: LiveWidgetLayout): void {
  if (!Number.isInteger(layout.width) || layout.width < MIN_WIDGET_WIDTH || layout.width > 12
    || !Number.isInteger(layout.height) || layout.height < 1 || layout.height > 100) {
    throw new Error("Widget layout is invalid")
  }
}
