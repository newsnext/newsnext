import { useParams } from "@tanstack/react-router"
import { useAtomValue, useSetAtom } from "jotai"
import { useEffect } from "react"
import { Desk } from "@/components/desk"
import { boardsAtom, currentBoardIdAtom } from "@/store/board"

export function BoardIdComponent() {
  const { boardId } = useParams({ strict: false }) as { boardId: string }
  const boards = useAtomValue(boardsAtom)
  const setCurrentBoardId = useSetAtom(currentBoardIdAtom)
  const boardExists = boards.some(board => board.id === boardId)

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
