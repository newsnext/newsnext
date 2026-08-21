import { Navigate, useLocation, useParams } from "@tanstack/react-router"
import { useAtomValue, useSetAtom } from "jotai"
import { useEffect } from "react"
import { BoardView } from "@/components/board-view"
import { getBoardLayerFromState } from "@/lib/board"
import { handleThemeSwitch } from "@/lib/utils/swith-theme"
import { boardsAtom } from "@/store/board"
import { currentBoardIdAtom } from "@/store/settings"

export function BoardIdComponent() {
  const { boardId } = useParams({ strict: false }) as { boardId: string }
  const layer = useLocation({ select: location => getBoardLayerFromState(location.state) })
  const boards = useAtomValue(boardsAtom)
  const setCurrentBoardId = useSetAtom(currentBoardIdAtom)
  const board = boards.find(board => board.id === boardId)
  const boardExists = board !== undefined

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

  if (!layer) {
    return (
      <Navigate
        to="/board/$boardId"
        params={{ boardId }}
        state={state => ({ ...state, layer: board.defaultLayer })}
        replace
      />
    )
  }

  return (
    <BoardView board={board} layer={layer} />
  )
}
