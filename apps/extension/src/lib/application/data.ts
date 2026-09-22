import type { ApplicationData, Board, LiveCard, LiveWidget, StoredBoard, StoredLiveCard, StoredLiveWidget } from "@newsnext/sdk/models"
import { APPLICATION_DATA_VERSION } from "@newsnext/sdk/models"
import { DEFAULT_BOARD_COLOR, DEFAULT_BOARD_LAYER, INITIAL_BOARD_NAME } from "../board"
import { createId } from "../id"

export { APPLICATION_DATA_VERSION } from "@newsnext/sdk/models"
export type { ApplicationData } from "@newsnext/sdk/models"

// Durable entities are keyed by ID. Arrays are assembled only at query/transport boundaries.
export interface InitialApplicationDataOptions {
  boardId?: string
  boardName?: string
  createdAt?: number
}

export function createEmptyApplicationData(): ApplicationData {
  return {
    version: APPLICATION_DATA_VERSION,
    boardOrder: [],
    boards: {},
    liveCards: {},
    liveWidgets: {},
  }
}

export function createInitialApplicationData(
  options: InitialApplicationDataOptions = {},
): ApplicationData {
  const {
    boardId = createId(),
    boardName = INITIAL_BOARD_NAME,
    createdAt = Date.now(),
  } = options
  return {
    version: APPLICATION_DATA_VERSION,
    boardOrder: [boardId],
    boards: {
      [boardId]: {
        color: DEFAULT_BOARD_COLOR,
        createdAt,
        layer: DEFAULT_BOARD_LAYER,
        name: boardName,
        nowLayer: { liveCards: [] },
        nextLayer: { liveWidgets: [] },
      },
    },
    liveCards: {},
    liveWidgets: {},
  }
}

export function getApplicationLiveCards(data: ApplicationData): LiveCard[] {
  return data.boardOrder.flatMap(boardId => data.boards[boardId]?.nowLayer.liveCards.flatMap((cardId) => {
    const card = data.liveCards[cardId]
    return card ? [toLiveCard(cardId, card)] : []
  }) ?? [])
}

export function getApplicationBoards(data: ApplicationData): Board[] {
  return data.boardOrder.flatMap((boardId) => {
    const board = data.boards[boardId]
    return board ? [toBoard(data, boardId, board)] : []
  })
}

export function getApplicationLiveWidgets(data: ApplicationData): Array<LiveWidget & { boardId: string }> {
  return data.boardOrder.flatMap(boardId => data.boards[boardId]?.nextLayer.liveWidgets.flatMap((liveWidgetId) => {
    const widget = data.liveWidgets[liveWidgetId]
    return widget ? [{ ...toLiveWidget(liveWidgetId, widget), boardId }] : []
  }) ?? [])
}

export function getStoredBoard(data: ApplicationData, boardId: string): StoredBoard {
  const board = data.boards[boardId]
  if (!board) throw new Error(`Board '${boardId}' not found`)
  return board
}

export function toBoard(data: ApplicationData, boardId: string, board = getStoredBoard(data, boardId)): Board {
  return {
    color: board.color,
    createdAt: board.createdAt,
    id: boardId,
    layer: board.layer,
    name: board.name,
    nowLayer: {
      liveCards: board.nowLayer.liveCards.flatMap((cardId) => {
        const card = data.liveCards[cardId]
        return card ? [toLiveCard(cardId, card)] : []
      }),
    },
    nextLayer: {
      liveWidgets: board.nextLayer.liveWidgets.flatMap((liveWidgetId) => {
        const widget = data.liveWidgets[liveWidgetId]
        return widget ? [toLiveWidget(liveWidgetId, widget)] : []
      }),
    },
  }
}

export function toLiveCard(cardId: string, card: StoredLiveCard): LiveCard {
  return { cardId, ...card }
}

export function toLiveWidget(liveWidgetId: string, widget: StoredLiveWidget): LiveWidget {
  return { liveWidgetId, ...widget }
}

export function ensureApplicationDataIntegrity(
  data: ApplicationData,
  options: InitialApplicationDataOptions = {},
): ApplicationData {
  const initialized = Object.keys(data.boards).length > 0
    ? data
    : createInitialApplicationData(options)
  return initialized
}
