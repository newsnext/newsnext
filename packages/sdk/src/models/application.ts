import type { Board, LiveWidget } from "./board.js"
import type { LiveCard } from "./live-card.js"

export const APPLICATION_DATA_VERSION = 12 as const

export interface StoredBoard extends Omit<Board, "id" | "nowLayer" | "nextLayer"> {
  nowLayer: { liveCards: string[] }
  nextLayer: { liveWidgets: string[] }
}

export type StoredLiveCard = Omit<LiveCard, "cardId">

export type StoredLiveWidget = Omit<LiveWidget, "liveWidgetId">

export interface ApplicationData {
  version: typeof APPLICATION_DATA_VERSION
  boardOrder: string[]
  boards: Record<string, StoredBoard>
  liveCards: Record<string, StoredLiveCard>
  liveWidgets: Record<string, StoredLiveWidget>
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

export interface ApplicationNextLayerLiveWidget extends LiveWidget {
  boardId: string
}

export type BoardDeleteInput
  = | { boardId: string, deleteLiveCards: true, targetBoardId?: never }
    | { boardId: string, deleteLiveCards?: never, targetBoardId: string }
