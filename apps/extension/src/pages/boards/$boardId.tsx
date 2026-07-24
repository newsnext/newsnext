import type { BoardType } from "@/store/board"
import { Navigate, useParams } from "@tanstack/react-router"
import { useSetAtom } from "jotai"
import { useEffect } from "react"
import { Desk } from "@/components/desk"
import { parseStoredBoard } from "@/lib/board-default"
import { currentBoardAtom } from "@/store/board"

const LAST_ACTIVE_BOARD_KEY = "newsnext-last-active-board"

export function BoardIdComponent() {
  const { boardId: rawBoardId } = useParams({ strict: false }) as { boardId: string }
  const boardId: BoardType = parseStoredBoard(rawBoardId)
  const setCurrentBoard = useSetAtom(currentBoardAtom)

  useEffect(() => {
    if (boardId) {
      localStorage.setItem(LAST_ACTIVE_BOARD_KEY, boardId)
      setCurrentBoard(boardId)
    }
  }, [boardId, setCurrentBoard])

  if (rawBoardId !== boardId) {
    return <Navigate to="/boards/$boardId" params={{ boardId }} replace />
  }

  return <Desk boardId={boardId} />
}
