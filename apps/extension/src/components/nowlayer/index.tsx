import { useSetAtom } from "jotai"
import { useCallback } from "react"
import { useBoardLiveCards } from "@/hooks/use-board-live-cards"
import { ALL_BOARD_ID } from "@/lib/board"
import { setManualBoardOrderAtom } from "@/store/board"
import { LiveCardContainer } from "./live-card-container"

interface NowLayerProps {
  boardId: string
  className?: string
}

export function NowLayer({
  boardId,
  className,
}: NowLayerProps) {
  const setManualBoardOrder = useSetAtom(setManualBoardOrderAtom)
  const { currentBoard, liveCardsByInstanceId, instanceIds } = useBoardLiveCards(boardId)
  const currentBoardName = currentBoard.name

  const handleInstanceIdsChange = useCallback((newInstanceIds: string[]) => {
    void setManualBoardOrder({ boardId, instanceIds: newInstanceIds }).catch((error) => {
      console.error("Failed to save manual LiveCard order", error)
    })
  }, [boardId, setManualBoardOrder])

  if (instanceIds.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-6 text-center text-sm text-muted-foreground">
        Use Radar on a page to add a LiveCard to
        {" "}
        {currentBoardName}
        .
      </div>
    )
  }

  return (
    <LiveCardContainer
      key={boardId}
      instanceIds={instanceIds}
      liveCardsByInstanceId={liveCardsByInstanceId}
      sortable={boardId !== ALL_BOARD_ID}
      className={className}
      onInstanceIdsChange={handleInstanceIdsChange}
    />
  )
}
