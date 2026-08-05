import type { Color } from "@newsnext/shared/types"
import type { BoardFilter } from "./board-filter"
import type { BoardSortMode, BoardSortPreference } from "./board-sorting"
import { createBoardSortPreference } from "./board-sorting"

export const ALL_BOARD_ID = "all"
export const ALL_BOARD_NAME = "All"
export const NO_BOARD_VALUE = "__no_board__"
export const DEFAULT_BOARD_COLOR: Color = "red"

export interface Board {
  filter?: BoardFilter
  sort: BoardSortPreference
  id: string
  name: string
  color?: Color
}

export function getBoardColor(board: Board): Color {
  return board.color ?? DEFAULT_BOARD_COLOR
}

export function isBoardNameTaken(boards: Board[], name: string, excludedBoardId?: string): boolean {
  const normalizedName = name.trim()
  return boards.some(board => board.id !== excludedBoardId
    && board.name.localeCompare(normalizedName, undefined, { sensitivity: "accent" }) === 0)
}

export function createBoard(
  name: string,
  color: Color = DEFAULT_BOARD_COLOR,
  sortMode?: BoardSortMode,
  filter?: BoardFilter,
): Board {
  return {
    id: `board_${crypto.randomUUID()}`,
    name: name.trim(),
    color,
    ...(filter ? { filter } : {}),
    sort: createBoardSortPreference(sortMode),
  }
}
