import type { BoardDeleteInput, WidgetMetadata, WidgetPatch } from "@newsnext/sdk/models"
import type { Color } from "@newsnext/shared/types"
import type {
  Board,
  BoardLayer,
  LiveWidgetDataScope,
  LiveWidgetLayout,
  NowLayerSortMode,
} from "../board"
import type { LiveCardPatch } from "../source/live-cards"
import type { ApplicationData } from "./data"
import { parseWidgetChartOptions } from "@newsnext/sdk/models"
import { createBoard } from "../board"
import { mergeLiveCardPatch } from "../source/live-cards"

export interface BoardConfiguration {
  color?: Color
  defaultLayer?: BoardLayer
  sortMode?: NowLayerSortMode
}

interface ApplicationLiveCardCreationInput {
  patch: LiveCardPatch
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
}

export function createBoardMutation(
  data: ApplicationData,
  input: BoardConfiguration & {
    liveCards?: ApplicationLiveCardCreationInput[]
    name: string
  },
  dependencies: ApplicationMutationDependencies,
): ApplicationMutationExecution {
  const name = input.name.trim()
  assertBoardName(name)
  const boardId = dependencies.createId()
  const board = configureBoard(
    createBoard(boardId, name, dependencies.now()),
    input,
  )
  let nextData: ApplicationData = {
    ...data,
    boards: [...data.boards, board],
  }
  for (const card of input.liveCards ?? []) {
    nextData = createLiveCardMutation(nextData, {
      ...card,
      boardId,
    }, dependencies).data
  }
  return { data: nextData, result: { boardId } }
}

export function updateBoardMutation(
  data: ApplicationData,
  input: BoardConfiguration & { boardId: string, name?: string },
): ApplicationMutationExecution {
  assertBoardExists(data, input.boardId)
  if (input.name === undefined
    && input.color === undefined
    && input.defaultLayer === undefined
    && input.sortMode === undefined) {
    throw new Error("Board update requires at least one change")
  }
  const name = input.name?.trim()
  if (name !== undefined) assertBoardName(name)
  return {
    data: {
      ...data,
      boards: data.boards.map(board => board.id === input.boardId
        ? configureBoard({
            ...board,
            ...(name !== undefined ? { name } : {}),
          }, input)
        : board),
    },
  }
}

export function deleteBoardMutation(
  data: ApplicationData,
  input: BoardDeleteInput,
): ApplicationMutationExecution {
  const { boardId, targetBoardId } = input
  const deleteLiveCards = input.deleteLiveCards === true
  const board = getBoard(data, boardId)
  if (data.boards.length === 1) throw new Error("NewsNext must keep at least one Board")
  if (!deleteLiveCards) {
    if (targetBoardId === undefined) throw new Error("Board deletion requires a transfer target")
    if (targetBoardId === boardId) {
      throw new Error("Board transfer target must differ from the deleted Board")
    }
    assertBoardExists(data, targetBoardId)
  }
  const liveCards = deleteLiveCards
    ? data.liveCards.filter(card => !board.cardIds.includes(card.cardId))
    : data.liveCards
  return {
    data: {
      ...data,
      boards: data.boards.flatMap((candidate) => {
        if (candidate.id === boardId) return []
        if (!deleteLiveCards && candidate.id === targetBoardId) {
          return [board.cardIds.toReversed().reduce(addLiveCardToBoard, candidate)]
        }
        return [candidate]
      }),
      liveCards,
    },
  }
}

export function setNowLayerManualOrderMutation(
  data: ApplicationData,
  input: { boardId: string, cardIds: string[] },
): ApplicationMutationExecution {
  const board = getBoard(data, input.boardId)
  assertCompleteLiveCardOrder(board.cardIds, input.cardIds)
  return {
    data: {
      ...data,
      boards: data.boards.map(candidate => candidate.id === input.boardId
        ? {
            ...candidate,
            nowLayer: {
              ...candidate.nowLayer,
              sort: { ...candidate.nowLayer.sort, mode: "manual", manualOrder: input.cardIds },
            },
          }
        : candidate),
    },
  }
}

export function installLiveWidgetMutation(
  data: ApplicationData,
  input: {
    boardId: string
    dataScope: LiveWidgetDataScope
    layout: LiveWidgetLayout
    widgetId: string
  },
): ApplicationMutationExecution {
  const board = getBoard(data, input.boardId)
  assertWidgetId(input.widgetId)
  assertWidgetDataScope(board, input.dataScope)
  assertWidgetLayout(input.layout)
  if (board.nextLayer.liveWidgets.some(widget => widget.widgetId === input.widgetId)) {
    throw new Error(`Widget '${input.widgetId}' is already installed in Board '${input.boardId}'`)
  }
  return replaceBoard(data, {
    ...board,
    nextLayer: {
      liveWidgets: [...board.nextLayer.liveWidgets, {
        dataScope: input.dataScope,
        layout: input.layout,
        widgetId: input.widgetId,
      }],
    },
  })
}

export function moveLiveWidgetMutation(
  data: ApplicationData,
  input: { boardId: string, targetBoardId: string, widgetId: string },
): ApplicationMutationExecution {
  const source = getBoard(data, input.boardId)
  const target = getBoard(data, input.targetBoardId)
  assertWidgetInstalled(source, input.widgetId)
  if (source.id === target.id) return { data }
  if (target.nextLayer.liveWidgets.some(widget => widget.widgetId === input.widgetId)) {
    throw new Error("The target Board already contains this Widget")
  }
  const widget = source.nextLayer.liveWidgets.find(widget => widget.widgetId === input.widgetId)!
  const moved = {
    ...widget,
    layout: { ...widget.layout, x: 0, y: Math.max(-1, ...target.nextLayer.liveWidgets.map(item => item.layout.y)) + 1 },
    dataScope: widget.dataScope.type === "cards"
      ? { ...widget.dataScope, cardIds: widget.dataScope.cardIds.filter(id => target.cardIds.includes(id)) }
      : widget.dataScope,
  }
  return {
    data: {
      ...data,
      boards: data.boards.map(board => board.id === source.id
        ? { ...board, nextLayer: { liveWidgets: board.nextLayer.liveWidgets.filter(item => item.widgetId !== input.widgetId) } }
        : board.id === target.id
          ? { ...board, nextLayer: { liveWidgets: [...board.nextLayer.liveWidgets, moved] } }
          : board),
    },
  }
}

export function removeLiveWidgetMutation(
  data: ApplicationData,
  input: { boardId: string, widgetId: string },
): ApplicationMutationExecution {
  const board = getBoard(data, input.boardId)
  assertWidgetInstalled(board, input.widgetId)
  return replaceBoard(data, {
    ...board,
    nextLayer: {
      liveWidgets: board.nextLayer.liveWidgets.filter(widget => widget.widgetId !== input.widgetId),
    },
  })
}

export function setLiveWidgetDataScopeMutation(
  data: ApplicationData,
  input: { boardId: string, dataScope: LiveWidgetDataScope, widgetId: string },
): ApplicationMutationExecution {
  const board = getBoard(data, input.boardId)
  assertWidgetInstalled(board, input.widgetId)
  assertWidgetDataScope(board, input.dataScope)
  return replaceBoard(data, {
    ...board,
    nextLayer: {
      liveWidgets: board.nextLayer.liveWidgets.map(widget => widget.widgetId === input.widgetId
        ? { ...widget, dataScope: input.dataScope }
        : widget),
    },
  })
}

export function setLiveWidgetMetadataMutation(
  data: ApplicationData,
  input: { boardId: string, widgetId: string, metadata: WidgetMetadata },
): ApplicationMutationExecution {
  const board = getBoard(data, input.boardId)
  assertWidgetInstalled(board, input.widgetId)
  const metadata = { ...input.metadata }
  const title = metadata.title?.trim()
  if (title) metadata.title = title
  else delete metadata.title
  return replaceBoard(data, {
    ...board,
    nextLayer: {
      liveWidgets: board.nextLayer.liveWidgets.map(widget => widget.widgetId === input.widgetId
        ? { ...widget, patch: { ...widget.patch, metadata } }
        : widget),
    },
  })
}

export function setLiveWidgetParamsMutation(
  data: ApplicationData,
  input: { boardId: string, widgetId: string, params: Record<string, unknown> },
): ApplicationMutationExecution {
  const board = getBoard(data, input.boardId)
  assertWidgetInstalled(board, input.widgetId)
  return replaceBoard(data, {
    ...board,
    nextLayer: {
      liveWidgets: board.nextLayer.liveWidgets.map(widget => widget.widgetId === input.widgetId
        ? { ...widget, patch: { ...widget.patch, params: input.params } }
        : widget),
    },
  })
}

/** Sparse field merge; null resets a whole section, matching Source override semantics. */
export function configureLiveWidgetMutation(
  data: ApplicationData,
  input: { boardId: string, widgetId: string, patch: { [K in keyof WidgetPatch]?: WidgetPatch[K] | null } },
): ApplicationMutationExecution {
  const board = getBoard(data, input.boardId)
  assertWidgetInstalled(board, input.widgetId)
  if (input.patch.view) parseWidgetChartOptions(input.patch.view, true)
  return replaceBoard(data, { ...board, nextLayer: { liveWidgets: board.nextLayer.liveWidgets.map((widget) => {
    if (widget.widgetId !== input.widgetId) return widget
    const patch = { ...widget.patch }
    for (const key of ["params", "metadata", "view"] as const) {
      const value = input.patch[key]
      if (value === null) delete patch[key]
      else if (value !== undefined) Object.assign(patch, { [key]: { ...patch[key], ...value } })
    }
    return { ...widget, patch }
  }) } })
}

export function setLiveWidgetLayoutsMutation(
  data: ApplicationData,
  input: {
    boardId: string
    liveWidgets: Array<{ layout: LiveWidgetLayout, widgetId: string }>
  },
): ApplicationMutationExecution {
  const board = getBoard(data, input.boardId)
  const updates = new Map<string, LiveWidgetLayout>()
  for (const widget of input.liveWidgets) {
    assertWidgetInstalled(board, widget.widgetId)
    assertWidgetLayout(widget.layout)
    if (updates.has(widget.widgetId)) throw new Error("Widget layout update IDs must be unique")
    updates.set(widget.widgetId, widget.layout)
  }
  if (updates.size === 0) throw new Error("At least one Widget layout is required")
  return replaceBoard(data, {
    ...board,
    nextLayer: {
      liveWidgets: board.nextLayer.liveWidgets.map(widget => ({
        ...widget,
        layout: updates.get(widget.widgetId) ?? widget.layout,
      })),
    },
  })
}

export function moveLiveCardMutation(
  data: ApplicationData,
  input: { boardId: string, cardId: string },
): ApplicationMutationExecution {
  assertBoardExists(data, input.boardId)
  assertLiveCardExists(data, input.cardId)
  return {
    data: {
      ...data,
      boards: data.boards.map(board => board.id === input.boardId
        ? addLiveCardToBoard(board, input.cardId)
        : removeLiveCardFromBoard(board, input.cardId)),
    },
  }
}

export function createLiveCardMutation(
  data: ApplicationData,
  input: ApplicationLiveCardCreationInput & { boardId: string },
  dependencies: ApplicationMutationDependencies,
): ApplicationMutationExecution {
  const { boardId, patch, sourceId } = input
  if (!sourceId.trim()) throw new Error("Source ID is required")
  assertBoardExists(data, boardId)
  const cardId = dependencies.createId()
  if (data.liveCards.some(card => card.cardId === cardId)) {
    throw new Error(`LiveCard '${cardId}' already exists`)
  }
  return {
    data: {
      ...data,
      liveCards: [...data.liveCards, {
        cardId,
        workerId: dependencies.workerId,
        sourceId,
        patch,
        createdAt: dependencies.now(),
      }],
      boards: data.boards.map(board => board.id === boardId
        ? addLiveCardToBoard(board, cardId)
        : board),
    },
    result: { cardId },
  }
}

export function configureLiveCardMutation(
  data: ApplicationData,
  input: { cardId: string, patch: LiveCardPatch },
): ApplicationMutationExecution {
  assertLiveCardExists(data, input.cardId)
  return {
    data: {
      ...data,
      liveCards: data.liveCards.map(card => card.cardId === input.cardId
        ? { ...card, patch: mergeLiveCardPatch(card.patch, input.patch) }
        : card),
    },
  }
}

export function resetLiveCardMetadataMutation(
  data: ApplicationData,
  input: { cardId: string },
): ApplicationMutationExecution {
  assertLiveCardExists(data, input.cardId)
  return {
    data: {
      ...data,
      liveCards: data.liveCards.map(card => card.cardId === input.cardId
        ? { ...card, patch: { ...card.patch, metadata: {} } }
        : card),
    },
  }
}

export function resetLiveCardParamsMutation(
  data: ApplicationData,
  input: { cardId: string },
): ApplicationMutationExecution {
  assertLiveCardExists(data, input.cardId)
  return {
    data: {
      ...data,
      liveCards: data.liveCards.map(card => card.cardId === input.cardId
        ? { ...card, patch: { ...card.patch, params: {} } }
        : card),
    },
  }
}

export function deleteLiveCardMutation(
  data: ApplicationData,
  input: { cardId: string },
): ApplicationMutationExecution {
  assertLiveCardExists(data, input.cardId)
  return {
    data: {
      ...data,
      liveCards: data.liveCards.filter(card => card.cardId !== input.cardId),
      boards: data.boards.map(board => removeLiveCardFromBoard(board, input.cardId)),
    },
  }
}

function addLiveCardToBoard(board: Board, cardId: string): Board {
  if (board.cardIds.includes(cardId)) return board
  const manualOrder = [
    cardId,
    ...board.nowLayer.sort.manualOrder.filter(candidate => candidate !== cardId),
  ]
  return {
    ...board,
    cardIds: [cardId, ...board.cardIds],
    nowLayer: {
      ...board.nowLayer,
      sort: { ...board.nowLayer.sort, manualOrder },
    },
  }
}

function removeLiveCardFromBoard(board: Board, cardId: string): Board {
  if (!board.cardIds.includes(cardId)) return board
  return {
    ...board,
    cardIds: board.cardIds.filter(candidate => candidate !== cardId),
    nowLayer: {
      ...board.nowLayer,
      sort: {
        ...board.nowLayer.sort,
        manualOrder: board.nowLayer.sort.manualOrder.filter(candidate => candidate !== cardId),
      },
    },
    nextLayer: {
      liveWidgets: board.nextLayer.liveWidgets.map(widget => widget.dataScope.type === "cards"
        ? {
            ...widget,
            dataScope: {
              ...widget.dataScope,
              cardIds: widget.dataScope.cardIds.filter(candidate => candidate !== cardId),
            },
          }
        : widget),
    },
  }
}

function configureBoard(
  board: Board,
  configuration: BoardConfiguration,
): Board {
  const sortMode = configuration.sortMode ?? board.nowLayer.sort.mode
  return {
    ...board,
    ...(configuration.color !== undefined ? { color: configuration.color } : {}),
    ...(configuration.defaultLayer !== undefined ? { defaultLayer: configuration.defaultLayer } : {}),
    nowLayer: {
      ...board.nowLayer,
      sort: {
        ...board.nowLayer.sort,
        mode: sortMode,
        automaticMode: sortMode === "manual"
          ? board.nowLayer.sort.automaticMode
          : sortMode,
      },
    },
  }
}

function assertCompleteLiveCardOrder(existingIds: string[], requestedIds: string[]): void {
  const existing = new Set(existingIds)
  const requested = new Set(requestedIds)
  if (requested.size !== requestedIds.length
    || requested.size !== existing.size
    || requestedIds.some(cardId => !existing.has(cardId))) {
    throw new Error("Manual order must contain every Board LiveCard exactly once")
  }
}

function getBoard(data: ApplicationData, boardId: string): Board {
  const board = data.boards.find(candidate => candidate.id === boardId)
  if (!board) throw new Error(`Board '${boardId}' not found`)
  return board
}

function assertBoardExists(data: ApplicationData, boardId: string): void {
  getBoard(data, boardId)
}

function assertLiveCardExists(data: ApplicationData, cardId: string): void {
  if (!data.liveCards.some(card => card.cardId === cardId)) {
    throw new Error(`LiveCard '${cardId}' not found`)
  }
}

function assertBoardName(name: string): void {
  if (!name) throw new Error("Board name is required")
}

function replaceBoard(data: ApplicationData, board: Board): ApplicationMutationExecution {
  return {
    data: {
      ...data,
      boards: data.boards.map(candidate => candidate.id === board.id ? board : candidate),
    },
  }
}

function assertWidgetId(widgetId: string): void {
  if (!widgetId || !/^[\w-]+$/.test(widgetId)) {
    throw new Error("Widget ID must contain only letters, numbers, '-' or '_'")
  }
}

function assertWidgetInstalled(board: Board, widgetId: string): void {
  if (!board.nextLayer.liveWidgets.some(widget => widget.widgetId === widgetId)) {
    throw new Error(`Widget '${widgetId}' is not installed in Board '${board.id}'`)
  }
}

function assertWidgetDataScope(board: Board, dataScope: LiveWidgetDataScope): void {
  if (dataScope.type === "board") return
  const cardIds = new Set(dataScope.cardIds)
  if (cardIds.size !== dataScope.cardIds.length
    || dataScope.cardIds.some(cardId => !board.cardIds.includes(cardId))) {
    throw new Error("Widget data scope must contain unique LiveCards from its Board")
  }
}

function assertWidgetLayout(layout: LiveWidgetLayout): void {
  if (!Number.isInteger(layout.x)
    || layout.x < 0
    || !Number.isInteger(layout.y)
    || layout.y < 0
    || !Number.isInteger(layout.width)
    || layout.width < 1
    || layout.width > 12
    || layout.x + layout.width > 12
    || !Number.isInteger(layout.height)
    || layout.height < 1
    || layout.height > 100) {
    throw new Error("Widget layout is invalid")
  }
}
