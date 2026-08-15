import { useParams } from "@tanstack/react-router"
import { useAtomValue, useSetAtom } from "jotai"
import { useEffect } from "react"
import { Desk } from "@/components/desk"
import { getBoardColor } from "@/lib/board"
import { handleThemeSwitch } from "@/lib/utils/swith-theme"
import { boardsAtom } from "@/store/board"
import { currentBoardIdAtom } from "@/store/settings"

export function BoardIdComponent() {
  const { boardId } = useParams({ strict: false }) as { boardId: string }
  const boards = useAtomValue(boardsAtom)
  const setCurrentBoardId = useSetAtom(currentBoardIdAtom)
  const board = boards.find(board => board.id === boardId)
  const boardExists = board !== undefined

  useEffect(() => {
    document.title = board ? `NewsNext | ${board.name}` : "NewsNext"
    if (board) {
      handleThemeSwitch(getBoardColor(board))
    }

    return () => {
      document.title = "NewsNext"
    }
  }, [board])

  useEffect(() => {
    if (boardExists) {
      setCurrentBoardId(boardId)
    }
  }, [boardExists, boardId, setCurrentBoardId])

  if (!boardExists) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Board not found.
      </div>
    )
  }

  return (
    <Desk
      key={`${boardId}:${board.defaultView}`}
      boardId={boardId}
      defaultView={board.defaultView}
    />
  )
}
