import { Navigate } from "@tanstack/react-router"
import { DEFAULT_BOARD_KEY, LAST_ACTIVE_BOARD_KEY, resolveDefaultBoard } from "@/lib/board-default"

export function IndexComponent() {
  const defaultBoard = (() => {
    const saved = localStorage.getItem(DEFAULT_BOARD_KEY)
    const lastActiveBoard = localStorage.getItem(LAST_ACTIVE_BOARD_KEY)
    return resolveDefaultBoard(saved, lastActiveBoard)
  })()

  return <Navigate to="/boards/$boardId" params={{ boardId: defaultBoard }} />
}
