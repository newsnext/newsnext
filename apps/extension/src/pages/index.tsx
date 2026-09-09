import { Navigate } from "@tanstack/react-router"
import { useAtomValueRawSync } from "jotai"
import { boardsAtom } from "@/store/board"
import { currentBoardIdAtom, defaultBoardIdAtom } from "@/store/settings"

export function IndexComponent() {
  const currentBoardId = useAtomValueRawSync(currentBoardIdAtom)
  const defaultBoardId = useAtomValueRawSync(defaultBoardIdAtom)
  const boards = useAtomValueRawSync(boardsAtom)
  const preferredBoardId = defaultBoardId ?? currentBoardId
  const boardId = boards.some(board => board.id === preferredBoardId)
    ? preferredBoardId
    : boards[0]?.id

  return boardId
    ? <Navigate to="/board/$boardId" params={{ boardId }} replace />
    : null
}
