import { useQueryClient } from "@tanstack/react-query"
import { useParams } from "@tanstack/react-router"
import { useAtomValueRawSync, useSetAtom } from "jotai"
import { useEffect, useMemo, useState } from "react"
import { BoardView } from "@/components/board-view"
import { restoreLiveCardResults } from "@/lib/source/restore-live-card-results"
import { handleThemeSwitch } from "@/lib/utils/swith-theme"
import { boardsAtom, liveCardsAtom } from "@/store/board"
import { currentBoardIdAtom } from "@/store/settings"

export function BoardIdComponent() {
  const { boardId } = useParams({ from: "/board/$boardId" })
  const boards = useAtomValueRawSync(boardsAtom)
  const liveCards = useAtomValueRawSync(liveCardsAtom)
  const queryClient = useQueryClient()
  const setCurrentBoardId = useSetAtom(currentBoardIdAtom)
  const [restoredBoardId, setRestoredBoardId] = useState<string>()
  const board = boards.find(board => board.id === boardId)
  const boardCardIds = board?.cardIds
  const boardLiveCards = useMemo(() => {
    if (!boardCardIds) return []
    const cardIdSet = new Set(boardCardIds)
    return liveCards.filter(card => cardIdSet.has(card.cardId))
  }, [boardCardIds, liveCards])
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

  useEffect(() => {
    if (!boardCardIds) return
    let active = true
    void restoreLiveCardResults(queryClient, boardLiveCards).finally(() => {
      if (active) setRestoredBoardId(boardId)
    })
    return () => {
      active = false
    }
  }, [boardId, boardCardIds, boardLiveCards, queryClient])

  if (!board) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Board not found.
      </div>
    )
  }

  const readyBoard = boards.find(candidate => candidate.id === restoredBoardId)
  return readyBoard ? <BoardView board={readyBoard} /> : null
}
