import type { BoardType } from "@/store/board"

export const DEFAULT_BOARD_KEY = "newsnext-default-board"
export const LAST_ACTIVE_BOARD_KEY = "newsnext-last-active-board"

export function parseStoredBoard(raw: string | null): BoardType {
  if (raw === "featured" || raw === "forks" || raw === "stars") return raw
  return "featured"
}

export function resolveDefaultBoard(savedDefaultBoard: string | null, savedLastActiveBoard: string | null): BoardType {
  if (!savedDefaultBoard || savedDefaultBoard === "last") {
    return parseStoredBoard(savedLastActiveBoard)
  }

  return parseStoredBoard(savedDefaultBoard)
}
