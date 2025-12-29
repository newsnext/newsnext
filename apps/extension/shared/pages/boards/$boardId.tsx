import type { BoardType } from "@/store/board"
import { useParams } from "@tanstack/react-router"
import { useEffect } from "react"
import { Desk } from "@/components/desk"

const LAST_ACTIVE_BOARD_KEY = "newsnext-last-active-board"

export function BoardIdComponent() {
  const { boardId } = useParams({ strict: false }) as { boardId: BoardType }

  useEffect(() => {
    if (boardId) {
      localStorage.setItem(LAST_ACTIVE_BOARD_KEY, boardId)
    }
  }, [boardId])

  return <Desk boardId={boardId} />
}
