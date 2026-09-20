import type { BoardDeleteInput, LiveWidgetInstallSize, WidgetMetadata } from "@newsnext/sdk/models"
import type { Color } from "@newsnext/shared/types"
import type {
  Board,
  BoardLayer,
  LiveWidget,
  LiveWidgetDataScope,
  LiveWidgetLayout,
} from "../board"
import type { LiveCardPatch } from "../source/live-cards"
import type { ApplicationData } from "./data"
import { MIN_WIDGET_WIDTH } from "@newsnext/sdk/models"
import { createBoard } from "../board"
import { mergeLiveCardPatch } from "../source/live-cards"

// Mutations are atomic; one Board owns each LiveCard, array order is display order.
export interface BoardConfiguration {
  color?: Color
  layer?: BoardLayer
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
  liveWidgetId?: string
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
    && input.layer === undefined) {
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
    ? data.liveCards.filter(card => !board.nowLayer.liveCards.includes(card.cardId))
    : data.liveCards
  return {
    data: {
      ...data,
      boards: data.boards.flatMap((candidate) => {
        if (candidate.id === boardId) return []
        if (!deleteLiveCards && candidate.id === targetBoardId) {
          return [board.nowLayer.liveCards.toReversed().reduce(addLiveCardToBoard, candidate)]
        }
        return [candidate]
      }),
      liveCards,
    },
  }
}

export function setNowLayerManualOrderMutation(
  data: ApplicationData,
  input: { boardId: string, liveCards: string[] },
): ApplicationMutationExecution {
  const board = getBoard(data, input.boardId)
  assertCompleteLiveCardOrder(board.nowLayer.liveCards, input.liveCards)
  return {
    data: {
      ...data,
      boards: data.boards.map(candidate => candidate.id === input.boardId
        ? {
            ...candidate,
            nowLayer: {
              ...candidate.nowLayer,
              liveCards: [...input.liveCards],
            },
          }
        : candidate),
    },
  }
}

export function setNextLayerManualOrderMutation(
  data: ApplicationData,
  input: { boardId: string, widgetIds: string[] },
): ApplicationMutationExecution {
  const board = getBoard(data, input.boardId)
  assertCompleteWidgetOrder(board.nextLayer.liveWidgets.map(w => w.liveWidgetId), input.widgetIds)
  const widgetsById = new Map(board.nextLayer.liveWidgets.map(widget => [widget.liveWidgetId, widget]))
  const liveWidgets = input.widgetIds.map((liveWidgetId) => {
    const widget = widgetsById.get(liveWidgetId)
    if (!widget) throw new Error(`Widget '${liveWidgetId}' is not installed in Board '${board.id}'`)
    return widget
  })
  return {
    data: {
      ...data,
      boards: data.boards.map(candidate => candidate.id === input.boardId
        ? {
            ...candidate,
            nextLayer: {
              ...candidate.nextLayer,
              liveWidgets,
            },
          }
        : candidate),
    },
  }
}

export function createLiveWidgetMutation(
  data: ApplicationData,
  input: {
    boardId: string
    dataScope: LiveWidgetDataScope
    size: LiveWidgetInstallSize
    widgetId: string
  },
  dependencies: Pick<ApplicationMutationDependencies, "createId">,
): ApplicationMutationExecution {
  const board = getBoard(data, input.boardId)
  assertWidgetId(input.widgetId)
  assertWidgetDataScope(board, input.dataScope)
  const layout: LiveWidgetLayout = {
    height: input.size.height ?? 2,
    width: input.size.width ?? 2,
  }
  assertWidgetLayout(layout)
  const liveWidgetId = dependencies.createId()
  if (!liveWidgetId || data.boards.some(board => board.nextLayer.liveWidgets.some(widget => widget.liveWidgetId === liveWidgetId))) {
    throw new Error("LiveWidget instance ID must be unique")
  }
  const execution = replaceBoard(data, {
    ...board,
    nextLayer: {
      ...board.nextLayer,
      liveWidgets: [{
        dataScope: input.dataScope,
        layout,
        widgetId: input.widgetId,
        liveWidgetId,
      }, ...board.nextLayer.liveWidgets],
    },
  })
  return { ...execution, result: { liveWidgetId } }
}

export function moveLiveWidgetMutation(
  data: ApplicationData,
  input: { boardId: string, liveWidgetId: string },
): ApplicationMutationExecution {
  const { board: source, widget } = findLiveWidget(data, input.liveWidgetId)
  const target = getBoard(data, input.boardId)
  if (source.id === target.id) return { data }
  // Whole-Board scopes follow the destination Board; explicit scopes keep only IDs present there.
  const moved = {
    ...widget,
    dataScope: widget.dataScope.type === "cards"
      ? { ...widget.dataScope, cardIds: widget.dataScope.cardIds.filter(id => target.nowLayer.liveCards.includes(id)) }
      : widget.dataScope,
  }
  return {
    data: {
      ...data,
      boards: data.boards.map(board => board.id === source.id
        ? { ...board, nextLayer: { ...board.nextLayer, liveWidgets: board.nextLayer.liveWidgets.filter(item => item.liveWidgetId !== input.liveWidgetId) } }
        : board.id === target.id
          ? { ...board, nextLayer: { ...board.nextLayer, liveWidgets: [moved, ...board.nextLayer.liveWidgets] } }
          : board),
    },
  }
}

export function deleteLiveWidgetMutation(
  data: ApplicationData,
  input: { liveWidgetId: string },
): ApplicationMutationExecution {
  const { board } = findLiveWidget(data, input.liveWidgetId)
  return replaceBoard(data, {
    ...board,
    nextLayer: {
      ...board.nextLayer,
      liveWidgets: board.nextLayer.liveWidgets.filter(widget => widget.liveWidgetId !== input.liveWidgetId),
    },
  })
}

/** Sparse field merge; null resets a whole section, matching Source override semantics. */
export function configureLiveWidgetMutation(
  data: ApplicationData,
  input: { liveWidgetId: string, patch: { dataScope?: LiveWidgetDataScope | null, metadata?: WidgetMetadata | null, params?: Record<string, unknown> | null } },
): ApplicationMutationExecution {
  const { board } = findLiveWidget(data, input.liveWidgetId)
  if (input.patch.dataScope !== undefined && input.patch.dataScope !== null) {
    assertWidgetDataScope(board, input.patch.dataScope)
  }
  return replaceBoard(data, { ...board, nextLayer: { ...board.nextLayer, liveWidgets: board.nextLayer.liveWidgets.map((widget) => {
    if (widget.liveWidgetId !== input.liveWidgetId) return widget
    const patch = { ...widget.patch }
    for (const key of ["params", "metadata"] as const) {
      const value = input.patch[key]
      if (value === null) {
        delete patch[key]
      } else if (value !== undefined) {
        const merged = { ...patch[key], ...value } as Record<string, unknown>
        if (key === "metadata" && typeof merged.title === "string") {
          const trimmed = merged.title.trim()
          if (trimmed) merged.title = trimmed
          else delete merged.title
        }
        Object.assign(patch, { [key]: merged })
      }
    }
    if (input.patch.dataScope === null) {
      return { ...widget, dataScope: { type: "board" as const }, patch }
    }
    if (input.patch.dataScope !== undefined) {
      return { ...widget, dataScope: input.patch.dataScope, patch }
    }
    return { ...widget, patch }
  }) } })
}

export function setLiveWidgetLayoutsMutation(
  data: ApplicationData,
  input: {
    boardId: string
    liveWidgets: Array<{ height: number, liveWidgetId: string, width: number }>
  },
): ApplicationMutationExecution {
  const board = getBoard(data, input.boardId)
  if (input.liveWidgets.length === 0) throw new Error("At least one Widget layout is required")
  const storedById = new Map(board.nextLayer.liveWidgets.map(widget => [widget.liveWidgetId, widget]))
  const liveWidgets = input.liveWidgets.map((widget) => {
    const stored = storedById.get(widget.liveWidgetId)
    if (!stored) throw new Error(`Widget '${widget.liveWidgetId}' is not installed in Board '${board.id}'`)
    const layout = { height: widget.height, width: widget.width }
    assertWidgetLayout(layout)
    return { ...stored, layout }
  })
  if (new Set(liveWidgets.map(widget => widget.liveWidgetId)).size !== liveWidgets.length) {
    throw new Error("Widget layout update IDs must be unique")
  }
  if (liveWidgets.length !== board.nextLayer.liveWidgets.length) {
    throw new Error("Widget layouts must cover every installed Widget exactly once")
  }
  return replaceBoard(data, {
    ...board,
    nextLayer: { ...board.nextLayer, liveWidgets },
  })
}

export function resetLiveWidgetMetadataMutation(
  data: ApplicationData,
  input: { liveWidgetId: string },
): ApplicationMutationExecution {
  const { board } = findLiveWidget(data, input.liveWidgetId)
  return replaceBoard(data, {
    ...board,
    nextLayer: {
      ...board.nextLayer,
      liveWidgets: board.nextLayer.liveWidgets.map(widget => widget.liveWidgetId === input.liveWidgetId
        ? { ...widget, patch: { ...widget.patch, metadata: {} } }
        : widget),
    },
  })
}

export function resetLiveWidgetParamsMutation(
  data: ApplicationData,
  input: { liveWidgetId: string },
): ApplicationMutationExecution {
  const { board } = findLiveWidget(data, input.liveWidgetId)
  return replaceBoard(data, {
    ...board,
    nextLayer: {
      ...board.nextLayer,
      liveWidgets: board.nextLayer.liveWidgets.map(widget => widget.liveWidgetId === input.liveWidgetId
        ? { ...widget, patch: { ...widget.patch, params: {} } }
        : widget),
    },
  })
}

/** Transfer between Boards; re-adding to the same Board is idempotent and keeps order. */
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
  if (board.nowLayer.liveCards.includes(cardId)) return board
  // Front-insert keeps newest-first display order; the LiveCard's creation time is untouched.
  return {
    ...board,
    nowLayer: {
      ...board.nowLayer,
      liveCards: [cardId, ...board.nowLayer.liveCards],
    },
  }
}

function removeLiveCardFromBoard(board: Board, cardId: string): Board {
  if (!board.nowLayer.liveCards.includes(cardId)) return board
  return {
    ...board,
    nowLayer: {
      ...board.nowLayer,
      liveCards: board.nowLayer.liveCards.filter(candidate => candidate !== cardId),
    },
    nextLayer: {
      ...board.nextLayer,
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
  return {
    ...board,
    ...(configuration.color !== undefined ? { color: configuration.color } : {}),
    ...(configuration.layer !== undefined ? { layer: configuration.layer } : {}),
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

function assertCompleteWidgetOrder(existingIds: string[], requestedIds: string[]): void {
  const existing = new Set(existingIds)
  const requested = new Set(requestedIds)
  if (requested.size !== requestedIds.length
    || requested.size !== existing.size
    || requestedIds.some(widgetId => !existing.has(widgetId))) {
    throw new Error("Manual order must contain every Board Widget exactly once")
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

function assertWidgetInstalled(board: Board, liveWidgetId: string): void {
  if (!board.nextLayer.liveWidgets.some(widget => widget.liveWidgetId === liveWidgetId)) {
    throw new Error(`Widget '${liveWidgetId}' is not installed in Board '${board.id}'`)
  }
}

function findLiveWidget(data: ApplicationData, liveWidgetId: string): { board: Board, widget: LiveWidget, widgetIndex: number } {
  for (const board of data.boards) {
    const widgetIndex = board.nextLayer.liveWidgets.findIndex(w => w.liveWidgetId === liveWidgetId)
    if (widgetIndex !== -1) return { board, widget: board.nextLayer.liveWidgets[widgetIndex]!, widgetIndex }
  }
  throw new Error(`LiveWidget '${liveWidgetId}' not found`)
}

function assertWidgetDataScope(board: Board, dataScope: LiveWidgetDataScope): void {
  if (dataScope.type === "board") return
  const cardIds = new Set(dataScope.cardIds)
  if (cardIds.size !== dataScope.cardIds.length
    || dataScope.cardIds.some(cardId => !board.nowLayer.liveCards.includes(cardId))) {
    throw new Error("Widget data scope must contain unique LiveCards from its Board")
  }
}

function assertWidgetLayout(layout: LiveWidgetLayout): void {
  if (!Number.isInteger(layout.width)
    || layout.width < MIN_WIDGET_WIDTH
    || layout.width > 12
    || !Number.isInteger(layout.height)
    || layout.height < 1
    || layout.height > 100) {
    throw new Error("Widget layout is invalid")
  }
}
