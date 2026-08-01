import { useParams } from "@tanstack/react-router"
import { useAtomValue, useSetAtom } from "jotai"
import { useEffect } from "react"
import { Desk } from "@/components/desk"
import { getBoardDisplayName } from "@/lib/boards"
import { boardsAtom, currentBoardIdAtom } from "@/store/board"

export function BoardIdComponent() {
  const { boardId } = useParams({ strict: false }) as { boardId: string }
  const boards = useAtomValue(boardsAtom)
  const setCurrentBoardId = useSetAtom(currentBoardIdAtom)
  const board = boards.find(board => board.id === boardId)
  const boardExists = board !== undefined

  useEffect(() => {
    document.title = board ? `NewsNext | ${getBoardDisplayName(board)}` : "NewsNext"

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

  return <Desk boardId={boardId} />
}
