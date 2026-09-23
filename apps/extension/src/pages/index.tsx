import { Navigate, useSearch } from "@tanstack/react-router"
import { useAtomValueRawSync } from "jotai"
import { boardsAtom } from "@/store/board"
import { currentBoardIdAtom, defaultBoardIdAtom } from "@/store/settings"

export function IndexComponent() {
  const { layer } = useSearch({ from: "/" })
  // RawSync avoids missing hydration between render and subscribe; useAtomValue can redirect to the wrong fallback board.
  const currentBoardId = useAtomValueRawSync(currentBoardIdAtom)
  const defaultBoardId = useAtomValueRawSync(defaultBoardIdAtom)
  const boards = useAtomValueRawSync(boardsAtom)
  const preferredBoardId = defaultBoardId ?? currentBoardId
  const boardId = boards.some(board => board.id === preferredBoardId)
    ? preferredBoardId
    : boards[0]?.id

  return boardId
    ? <Navigate to="/board/$boardId" params={{ boardId }} search={{ layer }} replace />
    : null
}
