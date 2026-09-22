import type { ApplicationData } from "@newsnext/sdk/models"
import type { LiveCard } from "../source"
import { APPLICATION_DATA_VERSION } from "@newsnext/sdk/models"
import { createBoard, INITIAL_BOARD_NAME } from "../board"
import { createId } from "../id"

export { APPLICATION_DATA_VERSION } from "@newsnext/sdk/models"
export type { ApplicationData } from "@newsnext/sdk/models"

// Browser storage owns the Board tree; each Board owns its ordered LiveCards.
export interface InitialApplicationDataOptions {
  boardId?: string
  boardName?: string
  createdAt?: number
}

export function createEmptyApplicationData(): ApplicationData {
  return {
    version: APPLICATION_DATA_VERSION,
    boards: [],
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
  }
}

export function getApplicationLiveCards(data: ApplicationData): LiveCard[] {
  return data.boards.flatMap(board => board.nowLayer.liveCards)
}

export function ensureApplicationDataIntegrity(
  data: ApplicationData,
  options: InitialApplicationDataOptions = {},
): ApplicationData {
  const initialized = data.boards.length > 0
    ? data
    : createInitialApplicationData(options)
  return initialized
}
