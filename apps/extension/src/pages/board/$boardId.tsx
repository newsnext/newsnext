import { useParams, useSearch } from "@tanstack/react-router"
import { useAtomValueRawSync, useSetAtom } from "jotai"
import { useEffect } from "react"
import { BoardView } from "@/components/board-view"
import { handleThemeSwitch } from "@/lib/utils/swith-theme"
import { boardsAtom } from "@/store/board"
import { currentBoardIdAtom } from "@/store/settings"

export function BoardIdComponent() {
  const { boardId } = useParams({ from: "/board/$boardId" })
  const { layer } = useSearch({ from: "/board/$boardId" })
  // RawSync avoids missing hydration between render and subscribe; useAtomValue can route to a stale default board.
  const boards = useAtomValueRawSync(boardsAtom)
  const setCurrentBoardId = useSetAtom(currentBoardIdAtom)
  const board = boards.find(board => board.id === boardId)
  const boardCardIds = board?.nowLayer.liveCards
  useEffect(() => {
    document.title = board ? `NewsNext | ${board.name}` : "NewsNext"
    if (board) {
      handleThemeSwitch(board.color)
    }

    return () => {
      document.title = "NewsNext"
    }
  }, [board])

  useEffect(() => {
    if (boardCardIds) {
      setCurrentBoardId(boardId)
    }
  }, [boardId, boardCardIds, setCurrentBoardId])

  if (!board) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Board not found.
      </div>
    )
  }

  return <BoardView board={board} layer={layer ?? board.layer} />
}
