import type { Color } from "@newsnext/shared/types"

export const ALL_BOARD_ID = "inbox"
export const ALL_BOARD_NAME = "All"
export const NO_BOARD_VALUE = "__no_board__"
export const DEFAULT_BOARD_COLOR: Color = "red"

export interface Board {
  id: string
  name: string
  color?: Color
}

export function getBoardDisplayName(board: Board): string {
  return board.id === ALL_BOARD_ID ? ALL_BOARD_NAME : board.name
}

export function getBoardColor(board: Board): Color {
  return board.color ?? DEFAULT_BOARD_COLOR
}

export function isBoardNameTaken(boards: Board[], name: string, excludedBoardId?: string): boolean {
  const normalizedName = name.trim()
  return boards.some(board => board.id !== excludedBoardId
    && getBoardDisplayName(board).localeCompare(normalizedName, undefined, { sensitivity: "accent" }) === 0)
}

export function createBoard(name: string, color: Color = DEFAULT_BOARD_COLOR): Board {
  return {
    id: `board_${crypto.randomUUID()}`,
    name: name.trim(),
    color,
  }
}
