import type { RefObject } from "react"
import { useSetAtom } from "jotai"
import { useCallback } from "react"
import { useBoardSourceCards } from "@/hooks/use-board-source-cards"
import { ALL_BOARD_ID } from "@/lib/board"
import { setManualBoardOrderAtom } from "@/store/board"
import { DesktopBoard } from "./desktop-board"

interface NowLayerProps {
  boardId: string
  className?: string
  isScattered?: boolean
  containerRef?: RefObject<HTMLDivElement | null>
}

export function NowLayer({
  boardId,
  className,
  isScattered,
  containerRef,
}: NowLayerProps) {
  const setManualBoardOrder = useSetAtom(setManualBoardOrderAtom)
  const { currentBoard, sourceCardsMap, sourceIds } = useBoardSourceCards(boardId)
  const currentBoardName = currentBoard.name

  const handleSourceIdsChange = useCallback((newSourceIds: string[]) => {
    setManualBoardOrder({ boardId, sourceIds: newSourceIds })
  }, [boardId, setManualBoardOrder])

  if (sourceIds.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-6 text-center text-sm text-muted-foreground">
        Use Radar on a page to add a card to
        {" "}
        {currentBoardName}
        .
      </div>
    )
  }

  return (
    <DesktopBoard
      key={boardId}
      sourceIds={sourceIds}
      sourceCardsMap={sourceCardsMap}
      sortable={boardId !== ALL_BOARD_ID}
      filter={currentBoard.filter}
      className={className}
      isScattered={isScattered}
      containerRef={containerRef}
      onSourceIdsChange={handleSourceIdsChange}
    />
  )
}
