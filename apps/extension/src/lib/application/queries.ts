import type { ApplicationBoardContext, ApplicationNowLayerLiveCard, BoardConfigurationResult, BoardDetail } from "@newsnext/sdk/models"
import type { SourceDescriptor } from "@newsnext/source-kit/types"
import type { Board } from "../board"
import type { LiveCard } from "../source/live-cards"
import type { ApplicationData } from "./data"

export type { ApplicationBoardContext, ApplicationNowLayerLiveCard, BoardConfigurationResult, BoardDetail } from "@newsnext/sdk/models"

export function listSourcesQuery(sources: readonly SourceDescriptor[]): SourceDescriptor[] {
  return [...sources]
}

export function getSourceQuery(
  sources: readonly SourceDescriptor[],
  input: { sourceId: string },
): SourceDescriptor {
  const source = sources.find(candidate => candidate.id === input.sourceId)
  if (!source) throw new Error(`Source '${input.sourceId}' not found`)
  return source
}

export function listBoardsQuery(data: ApplicationData): Board[] {
  return data.boards
}

export function getBoardQuery(
  data: ApplicationData,
  input: { boardId: string },
): BoardDetail {
  const board = getBoard(data, input.boardId)
  return { board, liveCards: resolveBoardLiveCards(data, board) }
}

export function listBoardLiveCardsQuery(
  data: ApplicationData,
  input: { boardId: string },
): LiveCard[] {
  return resolveBoardLiveCards(data, getBoard(data, input.boardId))
}

export function listLiveCardsQuery(data: ApplicationData): LiveCard[] {
  return data.liveCards
}

export function getLiveCardQuery(
  data: ApplicationData,
  input: { cardId: string },
): LiveCard {
  const card = data.liveCards.find(candidate => candidate.cardId === input.cardId)
  if (!card) throw new Error(`LiveCard '${input.cardId}' not found`)
  return card
}

export function getBoardContextQuery(
  data: ApplicationData,
  currentBoardId?: string,
): ApplicationBoardContext {
  return resolveBoardContext(data, currentBoardId)
}

export function getBoardConfigurationQuery(
  data: ApplicationData,
  input: { boardId: string },
): BoardConfigurationResult {
  const { color, defaultLayer, nowLayer } = getBoard(data, input.boardId)
  return { color, defaultLayer, nowLayer }
}

export function getNowLayerLiveCardsQuery(
  data: ApplicationData,
  currentBoardId?: string,
): ApplicationNowLayerLiveCard[] {
  const context = resolveBoardContext(data, currentBoardId)
  const board = getBoard(data, context.boardId)
  return resolveBoardLiveCards(data, board).map(card => ({
    boardId: board.id,
    cardId: card.cardId,
    sourceId: card.sourceId,
  }))
}

function resolveBoardContext(
  data: ApplicationData,
  currentBoardId?: string,
): ApplicationBoardContext {
  const board = data.boards.find(candidate => candidate.id === currentBoardId)
    ?? data.boards[0]
  if (!board) throw new Error("NewsNext has no Boards")
  return { boardId: board.id, boardName: board.name }
}

function getBoard(data: ApplicationData, boardId: string): Board {
  const board = data.boards.find(candidate => candidate.id === boardId)
  if (!board) throw new Error(`Board '${boardId}' not found`)
  return board
}

function resolveBoardLiveCards(
  data: ApplicationData,
  board: Board,
): LiveCard[] {
  const liveCards = new Map(data.liveCards.map(card => [card.cardId, card]))
  return board.cardIds.flatMap((cardId) => {
    const card = liveCards.get(cardId)
    return card ? [card] : []
  })
}
