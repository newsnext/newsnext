import type { RefObject } from "react"
import { useSetAtom } from "jotai"
import { useCallback } from "react"
import { useBoardSourceCards } from "@/hooks/use-board-source-cards"
import { ALL_BOARD_ID } from "@/lib/board"
import { setManualBoardOrderAtom } from "@/store/board"
import { CardContainer } from "./card-container"

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
  const { currentBoard, cardsByInstanceId, instanceIds } = useBoardSourceCards(boardId)
  const currentBoardName = currentBoard.name

  const handleInstanceIdsChange = useCallback((newInstanceIds: string[]) => {
    void setManualBoardOrder({ boardId, instanceIds: newInstanceIds }).catch((error) => {
      console.error("Failed to save manual Card order", error)
    })
  }, [boardId, setManualBoardOrder])

  if (instanceIds.length === 0) {
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
    <CardContainer
      key={boardId}
      instanceIds={instanceIds}
      cardsByInstanceId={cardsByInstanceId}
      sortable={boardId !== ALL_BOARD_ID}
      className={className}
      isScattered={isScattered}
      containerRef={containerRef}
      onInstanceIdsChange={handleInstanceIdsChange}
    />
  )
}
