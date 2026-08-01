export const ALL_BOARD_ID = "inbox"
export const ALL_BOARD_NAME = "All"
export const NO_BOARD_VALUE = "__no_board__"

export interface Board {
  id: string
  name: string
}

export function getBoardDisplayName(board: Board): string {
  return board.id === ALL_BOARD_ID ? ALL_BOARD_NAME : board.name
}

export function createBoard(name: string): Board {
  return {
    id: `board_${crypto.randomUUID()}`,
    name: name.trim(),
  }
}
