import type { Color } from "@newsnext/shared/types"
import type { BoardSortMode, BoardSortPreference } from "./sorting"
import { createBoardSortPreference } from "./sorting"

export const ALL_BOARD_ID = "all"
export const ALL_BOARD_NAME = "All"
export const NO_BOARD_VALUE = "__no_board__"
export const DEFAULT_BOARD_COLOR: Color = "red"

export type BoardViewMode = "now" | "next"

export const DEFAULT_BOARD_VIEW_MODE: BoardViewMode = "now"

export interface Board {
  defaultView: BoardViewMode
  sort: BoardSortPreference
  id: string
  name: string
  color?: Color
}

export interface BoardCreateInput {
  color: Color
  defaultView: BoardViewMode
  name: string
  sortMode: BoardSortMode
}

export function createAllBoard(color: Color): Board {
  return {
    color,
    defaultView: DEFAULT_BOARD_VIEW_MODE,
    id: ALL_BOARD_ID,
    name: ALL_BOARD_NAME,
    sort: createBoardSortPreference("createdAt"),
  }
}

export function normalizeBoardViewMode(value: unknown): BoardViewMode {
  return value === "next" ? "next" : DEFAULT_BOARD_VIEW_MODE
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
