import type { ElementEventBasePayload } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import type { NowLayerLiveCard } from "@/hooks/use-now-layer-live-cards"
import { useScrollProgressContext } from "@newsnext/ui/components/scroll-progress-context"
import { m } from "motion/react"
import { useCallback, useMemo, useState } from "react"
import { useCardEntrance } from "@/components/board-view/use-card-entrance"
import { DndContext } from "@/hooks/use-dnd-context"
import { useWrappedSortable } from "@/hooks/use-wrapped-sortable"
import { isSortableData } from "@/lib/board"
import { cn } from "@/lib/utils"
import { DraggableLiveCard } from "../live-card/draggable-live-card"

const LAYOUT_MEASUREMENT_SUSPENDED = Symbol("layout-measurement-suspended")

interface LiveCardContainerProps {
  entranceReady: boolean
  instanceIds: string[]
  liveCardsByInstanceId: Record<string, NowLayerLiveCard>
  sortable?: boolean
  className?: string
  onInstanceIdsChange: (instanceIds: string[]) => void
}

export function LiveCardContainer({
  entranceReady,
  instanceIds,
  liveCardsByInstanceId,
  sortable = true,
  className,
  onInstanceIdsChange,
}: LiveCardContainerProps) {
  const { rootScrollContainerRef } = useScrollProgressContext()
  const [draggingInstanceId, setDraggingInstanceId] = useState<string | null>(null)
  const [entranceComplete, setEntranceComplete] = useState(false)
  const {
    insertionIndicator,
    listRef,
    onDrag,
    onDragStart,
    onDrop,
    orderedInstanceIds,
  } = useWrappedSortable({
    enabled: sortable,
    instanceIds,
    onInstanceIdsChange,
    scrollContainerRef: rootScrollContainerRef,
  })
  const visibleLiveCards = useMemo(
    () => orderedInstanceIds.flatMap((id) => {
      const liveCard = liveCardsByInstanceId[id]
      return liveCard ? [{ id, ...liveCard }] : []
    }),
    [orderedInstanceIds, liveCardsByInstanceId],
  )
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
  const handleEntranceComplete = useCallback(() => {
    setEntranceComplete(true)
  }, [])
  useCardEntrance({
    active: entranceReady,
    containerRef: listRef,
    itemSelector: "[data-live-card-entrance]",
    onComplete: handleEntranceComplete,
    scrollContainerRef: rootScrollContainerRef,
  })

  return (
    <DndContext
      dropTargetRef={listRef}
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
          <m.li
            key={id}
            data-live-card-id={id}
            className="relative"
            layout
            layoutDependency={entranceComplete
              ? orderedInstanceIds
              : LAYOUT_MEASUREMENT_SUSPENDED}
          >
            {insertionIndicator?.id === id && (
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute inset-y-3 z-20 w-1 rounded-full bg-theme-400 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-theme-400),white_35%)] ${
                  insertionIndicator.edge === "left"
                    ? "-left-1.5 xs:-left-3.5"
                    : "-right-1.5 xs:-right-3.5"
                }`}
              />
            )}
            <div
              data-live-card-entrance
              className={entranceComplete ? undefined : "layer-card-entrance-pending"}
            >
              <DraggableLiveCard
                boardId={boardId}
                descriptor={descriptor}
                dragging={draggingInstanceId === id}
                instanceAtom={instanceAtom}
                sortable={sortable}
              />
            </div>
          </m.li>
        ))}
      </ol>
    </DndContext>
  )
}
