import type { ApplicationData } from "@newsnext/sdk/models"
import { APPLICATION_DATA_VERSION } from "@newsnext/sdk/models"
import { createBoard, INITIAL_BOARD_NAME } from "../board"
import { createId } from "../id"

export { APPLICATION_DATA_VERSION } from "@newsnext/sdk/models"
export type { ApplicationData } from "@newsnext/sdk/models"

export interface InitialApplicationDataOptions {
  boardId?: string
  boardName?: string
  createdAt?: number
}

export function createEmptyApplicationData(): ApplicationData {
  return {
    version: APPLICATION_DATA_VERSION,
    boards: [],
    liveCards: [],
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
    boards: [createBoard(boardId, boardName, createdAt)],
    liveCards: [],
  }
}

export function ensureApplicationDataIntegrity(
  data: ApplicationData,
  options: InitialApplicationDataOptions = {},
): ApplicationData {
  const initialized = data.boards.length > 0
    ? data
    : {
        ...createInitialApplicationData(options),
        liveCards: data.liveCards,
      }
  const assignedCardIds = new Set(initialized.boards.flatMap(board => board.cardIds))
  const unassignedCardIds = initialized.liveCards
    .filter(card => !assignedCardIds.has(card.cardId))
    .toSorted((left, right) => right.createdAt - left.createdAt || left.cardId.localeCompare(right.cardId))
    .map(card => card.cardId)
  if (unassignedCardIds.length === 0) return initialized

  const fallbackBoard = initialized.boards[0]!
  const cardIds = [...unassignedCardIds, ...fallbackBoard.cardIds]
  return {
    ...initialized,
    boards: initialized.boards.map(board => board.id === fallbackBoard.id
      ? {
          ...board,
          cardIds,
          nowLayer: {
            ...board.nowLayer,
            sort: {
              ...board.nowLayer.sort,
              manualOrder: [...unassignedCardIds, ...board.nowLayer.sort.manualOrder],
            },
          },
        }
      : board),
  }
}
