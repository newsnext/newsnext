import type { Board, BoardLayer } from "@newsnext/sdk/models"
import type { Color } from "@newsnext/shared/types"
import type { NowLayerSortMode } from "./sorting"
import { createNowLayerSort } from "./sorting"

export const INITIAL_BOARD_NAME = "My Board"
export const DEFAULT_BOARD_COLOR: Color = "red"

export type { BoardLayer } from "@newsnext/sdk/models"

export const DEFAULT_BOARD_LAYER: BoardLayer = "now"

export type { Board, NextLayerWidget, NextLayerWidgetDataScope, NextLayerWidgetLayout } from "@newsnext/sdk/models"

export interface BoardCreateInput {
  color: Color
  defaultLayer: BoardLayer
  name: string
  sortMode: NowLayerSortMode
}

export function createBoard(
  id: string,
  name: string,
  createdAt: number,
  color: Color = DEFAULT_BOARD_COLOR,
  sortMode: NowLayerSortMode = "addedAt",
  defaultLayer: BoardLayer = DEFAULT_BOARD_LAYER,
): Board {
  return {
    color,
    createdAt,
    defaultLayer,
    id,
    instanceIds: [],
    name,
    nowLayer: { sort: createNowLayerSort(sortMode) },
    nextLayer: { widgets: [] },
  }
}

export function normalizeBoardLayer(value: unknown): BoardLayer {
  return value === "next" ? "next" : DEFAULT_BOARD_LAYER
}

export function getAdjacentBoardId(
  boards: readonly Pick<Board, "id">[],
  currentBoardId: string,
  offset: -1 | 1,
): string | undefined {
  if (boards.length < 2) return undefined
  const currentIndex = boards.findIndex(board => board.id === currentBoardId)
  if (currentIndex === -1) return undefined
  return boards[(currentIndex + offset + boards.length) % boards.length]?.id
}
