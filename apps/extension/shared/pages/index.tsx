import type { BoardType } from "@/store/board"
import { Navigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"

const DEFAULT_BOARD_KEY = "newsnext-default-board"
const LAST_ACTIVE_BOARD_KEY = "newsnext-last-active-board"

function parseStoredBoard(raw: string | null): BoardType {
  if (raw === "featured" || raw === "copies" || raw === "stars") return raw
  return "featured"
}

export function IndexComponent() {
  const [defaultBoard, setDefaultBoard] = useState<BoardType | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(DEFAULT_BOARD_KEY)

    if (saved === "last") {
      setDefaultBoard(parseStoredBoard(localStorage.getItem(LAST_ACTIVE_BOARD_KEY)))
    } else {
      setDefaultBoard(parseStoredBoard(saved))
    }
  }, [])

  if (!defaultBoard) {
    return null // or a loading spinner
  }

  return <Navigate to="/boards/$boardId" params={{ boardId: defaultBoard }} />
}
