import { Navigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"

const DEFAULT_BOARD_KEY = "newsnext-default-board"
const LAST_ACTIVE_BOARD_KEY = "newsnext-last-active-board"

export function IndexComponent() {
  const [defaultBoard, setDefaultBoard] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(DEFAULT_BOARD_KEY)

    if (saved === "last") {
      const lastActive = localStorage.getItem(LAST_ACTIVE_BOARD_KEY)
      setDefaultBoard(lastActive || "hottest")
    } else {
      setDefaultBoard(saved || "hottest")
    }
  }, [])

  if (!defaultBoard) {
    return null // or a loading spinner
  }

  return <Navigate to="/boards/$boardId" params={{ boardId: defaultBoard }} />
}
