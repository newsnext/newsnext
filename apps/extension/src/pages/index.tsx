import { Navigate } from "@tanstack/react-router"
import { useAtomValue } from "jotai"
import { boardsAtom } from "@/store/board"
import { currentBoardIdAtom, defaultBoardIdAtom } from "@/store/settings"

export function IndexComponent() {
  const currentBoardId = useAtomValue(currentBoardIdAtom)
  const defaultBoardId = useAtomValue(defaultBoardIdAtom)
  const boards = useAtomValue(boardsAtom)
  const preferredBoardId = defaultBoardId ?? currentBoardId
  const boardId = boards.some(board => board.id === preferredBoardId)
    ? preferredBoardId
    : boards[0]?.id

  return boardId
    ? <Navigate to="/board/$boardId" params={{ boardId }} replace />
    : null
}
