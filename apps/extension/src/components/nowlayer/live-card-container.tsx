import type { ElementEventBasePayload } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import type { NowLayerLiveCard } from "@/hooks/use-now-layer-live-cards"
import { useScrollProgressContext } from "@newsnext/ui/components/scroll-progress-context"
import { cn } from "@newsnext/ui/lib/utils"
import { useCallback, useMemo, useState } from "react"
import { DndContext } from "@/hooks/use-dnd-context"
import { useSortableLayoutAnimation } from "@/hooks/use-sortable-layout-animation"
import { useWrappedSortable } from "@/hooks/use-wrapped-sortable"
import { isSortableData } from "@/lib/board"
import { DraggableLiveCard } from "../live-card/draggable-live-card"

interface LiveCardContainerProps {
  viewReady: boolean
  instanceIds: string[]
  liveCardsByInstanceId: Record<string, NowLayerLiveCard>
  sortable?: boolean
  className?: string
  onInstanceIdsChange: (instanceIds: string[]) => void
}

export function LiveCardContainer({
  viewReady,
  instanceIds,
  liveCardsByInstanceId,
  sortable = true,
  className,
  onInstanceIdsChange,
}: LiveCardContainerProps) {
  const { rootScrollContainerRef } = useScrollProgressContext()
  const [draggingInstanceId, setDraggingInstanceId] = useState<string | null>(null)
  const {
    listRef,
    onDrag,
    onDragStart,
    onDrop,
    orderedInstanceIds,
  } = useWrappedSortable({
    instanceIds,
    onInstanceIdsChange,
  })
  const visibleLiveCards = useMemo(
    () => orderedInstanceIds.flatMap((id) => {
      const liveCard = liveCardsByInstanceId[id]
      return liveCard ? [{ id, ...liveCard }] : []
    }),
    [orderedInstanceIds, liveCardsByInstanceId],
  )
  useSortableLayoutAnimation(listRef, visibleLiveCards.map(card => card.id), viewReady)
  const handleDragStart = useCallback((args: ElementEventBasePayload) => {
    if (isSortableData(args.source.data)) {
      setDraggingInstanceId(args.source.data.id)
    }
    onDragStart()
  }, [onDragStart])
  const handleDrop = useCallback((args: ElementEventBasePayload) => {
    onDrop(args)
    setDraggingInstanceId(null)
  }, [onDrop])

  return (
    <DndContext
      dropTargetRef={listRef}
      verticalScrollRef={sortable ? rootScrollContainerRef : undefined}
      scrollSpeed="fast"
      onDragStart={handleDragStart}
      onDrag={onDrag}
      onDrop={handleDrop}
    >
      <ol
        ref={listRef}
        className={cn(
          "relative flex flex-wrap justify-center gap-2 xs:gap-6",
          className,
        )}
      >
        {visibleLiveCards.map(({ id, boardId, descriptor, instanceAtom }) => (
          <li
            key={id}
            data-live-card-id={id}
            className="relative"
          >
            <div data-live-card-transition>
              <DraggableLiveCard
                boardId={boardId}
                descriptor={descriptor}
                dragging={draggingInstanceId === id}
                instanceAtom={instanceAtom}
                sortable={sortable}
              />
            </div>
          </li>
        ))}
      </ol>
    </DndContext>
  )
}
