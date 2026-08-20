import type { Color } from "@newsnext/shared/types"
import type { BoardSortMode, BoardSortPreference } from "./sorting"
import { createBoardSortPreference } from "./sorting"

export const ALL_BOARD_ID = "all"
export const ALL_BOARD_NAME = "All"
export const DEFAULT_BOARD_COLOR: Color = "red"

export type BoardLayer = "now" | "next"

export const DEFAULT_BOARD_LAYER: BoardLayer = "now"

export interface Board {
  defaultLayer: BoardLayer
  sort: BoardSortPreference
  id: string
  name: string
  color?: Color
}

export interface BoardCreateInput {
  color: Color
  defaultLayer: BoardLayer
  name: string
  sortMode: BoardSortMode
}

export function createAllBoard(
  color: Color,
  defaultLayer: BoardLayer = DEFAULT_BOARD_LAYER,
): Board {
  return {
    color,
    defaultLayer,
    id: ALL_BOARD_ID,
    name: ALL_BOARD_NAME,
    sort: createBoardSortPreference("createdAt"),
  }
}

export function normalizeBoardLayer(value: unknown): BoardLayer {
  return value === "next" ? "next" : DEFAULT_BOARD_LAYER
}

export function getBoardLayerFromState(state: unknown): BoardLayer | undefined {
  if (!state || typeof state !== "object" || !("layer" in state)) return undefined
  return state.layer === "next" || state.layer === "now" ? state.layer : undefined
}

export function getBoardColor(board: Board): Color {
  return board.color ?? DEFAULT_BOARD_COLOR
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
