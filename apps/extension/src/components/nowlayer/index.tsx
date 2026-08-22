import { useSetAtom } from "jotai"
import { useCallback } from "react"
import { useNowLayerLiveCards } from "@/hooks/use-now-layer-live-cards"
import { setNowLayerManualOrderAtom } from "@/store/board"
import { LiveCardContainer } from "./live-card-container"

interface NowLayerProps {
  boardId: string
  className?: string
  entranceReady: boolean
}

export function NowLayer({
  boardId,
  className,
  entranceReady,
}: NowLayerProps) {
  const setManualOrder = useSetAtom(setNowLayerManualOrderAtom)
  const { currentBoard, liveCardsByInstanceId, instanceIds } = useNowLayerLiveCards(boardId)

  const handleInstanceIdsChange = useCallback((newInstanceIds: string[]) => {
    void setManualOrder({ boardId, instanceIds: newInstanceIds }).catch((error) => {
      console.error("Failed to save manual LiveCard order", error)
    })
  }, [boardId, setManualOrder])

  if (instanceIds.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-6 text-center text-sm text-muted-foreground">
        Use Radar on a page to add a LiveCard to
        {" "}
        {currentBoard.name}
        .
      </div>
    )
  }

  return (
    <LiveCardContainer
      key={boardId}
      instanceIds={instanceIds}
      liveCardsByInstanceId={liveCardsByInstanceId}
      entranceReady={entranceReady}
      sortable
      className={className}
      onInstanceIdsChange={handleInstanceIdsChange}
    />
  )
}
