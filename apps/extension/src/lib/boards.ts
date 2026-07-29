export const DEFAULT_BOARD_ID = "inbox"
export const INBOX_ONLY_VALUE = "__inbox_only__"

export interface Board {
  id: string
  name: string
}

export function createBoard(name: string): Board {
  return {
    id: `board_${crypto.randomUUID()}`,
    name: name.trim(),
  }
}
