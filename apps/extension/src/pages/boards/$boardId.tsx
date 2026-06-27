import type { BoardType } from "@/store/board"
import { useParams } from "@tanstack/react-router"
import { useSetAtom } from "jotai"
import { useEffect } from "react"
import { Desk } from "@/components/desk"
import { currentBoardAtom } from "@/store/board"

const LAST_ACTIVE_BOARD_KEY = "newsnext-last-active-board"

export function BoardIdComponent() {
  const { boardId } = useParams({ strict: false }) as { boardId: BoardType }
  const setCurrentBoard = useSetAtom(currentBoardAtom)

  useEffect(() => {
    if (boardId) {
      localStorage.setItem(LAST_ACTIVE_BOARD_KEY, boardId)
      setCurrentBoard(boardId)
    }
  }, [boardId, setCurrentBoard])

  return <Desk boardId={boardId} />
}
