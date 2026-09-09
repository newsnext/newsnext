import type { Board } from "./board.js"
import type { Instance } from "./instance.js"

export const APPLICATION_DATA_VERSION = 6 as const

export interface ApplicationData {
  version: typeof APPLICATION_DATA_VERSION
  boards: Board[]
  instances: Instance[]
}

export interface ApplicationBoardContext {
  boardId: string
  boardName: string
}

export interface ApplicationNowLayerLiveCard {
  boardId: string
  instanceId: string
  sourceId: string
}

export interface BoardConfigurationResult {
  color: Board["color"]
  defaultLayer: Board["defaultLayer"]
  nowLayer: Board["nowLayer"]
}

export interface BoardDetail {
  board: Board
  instances: Instance[]
}

export type BoardDeleteInput
  = | { boardId: string, deleteInstances: true, targetBoardId?: never }
    | { boardId: string, deleteInstances?: never, targetBoardId: string }
