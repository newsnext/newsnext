import { useSetAtom } from "jotai"
import { useCallback } from "react"
import { useI18n } from "@/hooks/use-i18n"
import { useNowLayerLiveCards } from "@/hooks/use-now-layer-live-cards"
import { setNowLayerManualOrderAtom } from "@/store/board"
import { LiveCardContainer } from "./live-card-container"

interface NowLayerProps {
  boardId: string
  className?: string
  viewReady: boolean
}

export function NowLayer({
  boardId,
  className,
  viewReady,
}: NowLayerProps) {
  const { t } = useI18n()
  const setManualOrder = useSetAtom(setNowLayerManualOrderAtom)
  const { currentBoard, liveCardsByCardId, cardIds } = useNowLayerLiveCards(boardId)

  const handleCardIdsChange = useCallback((newCardIds: string[]) => {
    void setManualOrder({ boardId, cardIds: newCardIds }).catch((error) => {
      console.error("Failed to save manual LiveCard order", error)
    })
  }, [boardId, setManualOrder])

  if (cardIds.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-6 text-center text-sm text-muted-foreground">
        {t("emptyBoardDescription", { board: currentBoard.name })}
      </div>
    )
  }

  return (
    <LiveCardContainer
      key={boardId}
      cardIds={cardIds}
      liveCardsByCardId={liveCardsByCardId}
      viewReady={viewReady}
      sortable
      className={className}
      onCardIdsChange={handleCardIdsChange}
    />
  )
}
