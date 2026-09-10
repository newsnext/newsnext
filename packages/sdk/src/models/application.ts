import type { Board } from "./board.js"
import type { LiveCard } from "./live-card.js"

export const APPLICATION_DATA_VERSION = 7 as const

export interface ApplicationData {
  version: typeof APPLICATION_DATA_VERSION
  boards: Board[]
  liveCards: LiveCard[]
}

export interface ApplicationBoardContext {
  boardId: string
  boardName: string
}

export interface ApplicationNowLayerLiveCard {
  boardId: string
  cardId: string
  sourceId: string
}

export interface BoardConfigurationResult {
  color: Board["color"]
  defaultLayer: Board["defaultLayer"]
  nowLayer: Board["nowLayer"]
}

export interface BoardDetail {
  board: Board
  liveCards: LiveCard[]
}

export type BoardDeleteInput
  = | { boardId: string, deleteLiveCards: true, targetBoardId?: never }
    | { boardId: string, deleteLiveCards?: never, targetBoardId: string }
