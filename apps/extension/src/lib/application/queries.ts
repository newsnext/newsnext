import type { ApplicationBoardContext, ApplicationNextLayerLiveWidget, ApplicationNowLayerLiveCard, LiveWidget } from "@newsnext/sdk/models"
import type { SourceDescriptor } from "@newsnext/source-kit/types"
import type { Board } from "../board"
import type { LiveCard } from "../source/live-cards"
import type { ApplicationData } from "./data"
import { getApplicationBoards, getApplicationLiveCards, getApplicationLiveWidgets, getStoredBoard, toBoard, toLiveCard, toLiveWidget } from "./data"

// Queries never filter by registry availability; missing Sources degrade to generic cards.
export type { ApplicationBoardContext, ApplicationNextLayerLiveWidget, ApplicationNowLayerLiveCard, LiveWidget } from "@newsnext/sdk/models"

export function listSourcesQuery(sources: readonly SourceDescriptor[]): SourceDescriptor[] {
  return [...sources]
}

export function listBoardsQuery(data: ApplicationData): Board[] {
  return getApplicationBoards(data)
}

export function getBoardQuery(
  data: ApplicationData,
  input: { boardId: string },
): Board {
  return getBoard(data, input.boardId)
}

export function listBoardLiveCardsQuery(
  data: ApplicationData,
  input: { boardId: string },
): LiveCard[] {
  return getBoard(data, input.boardId).nowLayer.liveCards
}

export function listBoardLiveWidgetsQuery(
  data: ApplicationData,
  input: { boardId: string },
): LiveWidget[] {
  return getBoard(data, input.boardId).nextLayer.liveWidgets
}

export function listAllLiveWidgetsQuery(
  data: ApplicationData,
): ApplicationNextLayerLiveWidget[] {
  return getApplicationLiveWidgets(data)
}

export function getBoardLiveWidgetQuery(
  data: ApplicationData,
  input: { boardId: string, liveWidgetId: string },
): ApplicationNextLayerLiveWidget {
  const widget = data.liveWidgets[input.liveWidgetId]
  if (!widget || !data.boards[input.boardId]?.nextLayer.liveWidgets.includes(input.liveWidgetId)) throw new Error(`LiveWidget '${input.liveWidgetId}' not found in Board '${input.boardId}'`)
  return { ...toLiveWidget(input.liveWidgetId, widget), boardId: input.boardId }
}

export function getLiveWidgetQuery(
  data: ApplicationData,
  input: { liveWidgetId: string },
): ApplicationNextLayerLiveWidget {
  const widget = data.liveWidgets[input.liveWidgetId]
  if (!widget) throw new Error(`LiveWidget '${input.liveWidgetId}' not found`)
  const boardId = data.boardOrder.find(id => data.boards[id]?.nextLayer.liveWidgets.includes(input.liveWidgetId))
  if (!boardId) throw new Error(`LiveWidget '${input.liveWidgetId}' is not assigned to a Board`)
  return { ...toLiveWidget(input.liveWidgetId, widget), boardId }
}

export function listLiveCardsQuery(data: ApplicationData): LiveCard[] {
  return getApplicationLiveCards(data)
}

export function getLiveCardQuery(
  data: ApplicationData,
  input: { cardId: string },
): LiveCard {
  const stored = data.liveCards[input.cardId]
  const card = stored && toLiveCard(input.cardId, stored)
  if (!card) throw new Error(`LiveCard '${input.cardId}' not found`)
  return card
}

export function getBoardContextQuery(
  data: ApplicationData,
  currentBoardId?: string,
): ApplicationBoardContext {
  return resolveBoardContext(data, currentBoardId)
}

export function getNowLayerLiveCardsQuery(
  data: ApplicationData,
  currentBoardId?: string,
): ApplicationNowLayerLiveCard[] {
  const context = resolveBoardContext(data, currentBoardId)
  const board = getBoard(data, context.boardId)
  return board.nowLayer.liveCards.map(card => ({
    boardId: board.id,
    cardId: card.cardId,
    sourceId: card.sourceId,
  }))
}

function resolveBoardContext(
  data: ApplicationData,
  currentBoardId?: string,
): ApplicationBoardContext {
  const board = currentBoardId && data.boards[currentBoardId]
    ? toBoard(data, currentBoardId)
    : getApplicationBoards(data)[0]
  if (!board) throw new Error("NewsNext has no Boards")
  return { boardId: board.id, boardName: board.name }
}

function getBoard(data: ApplicationData, boardId: string): Board {
  return toBoard(data, boardId, getStoredBoard(data, boardId))
}
