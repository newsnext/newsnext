import type { ElementEventBasePayload } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import type { RefObject } from "react"
import type { NowLayerLiveCard } from "@/hooks/use-now-layer-live-cards"
import { useScrollProgressContext } from "@newsnext/ui/components/scroll-progress-context"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { m } from "motion/react"
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useCardEntrance } from "@/components/board-view/use-card-entrance"
import { DndContext } from "@/hooks/use-dnd-context"
import { useMarqueeSelection } from "@/hooks/use-marquee-selection"
import { useWrappedSortable } from "@/hooks/use-wrapped-sortable"
import { isSortableData } from "@/lib/board"
import { cn } from "@/lib/utils"
import { DraggableLiveCard } from "../live-card/draggable-live-card"

const LAYOUT_MEASUREMENT_SUSPENDED = Symbol("layout-measurement-suspended")

function SelectionOutline({
  containerRef,
  instanceIds,
  layoutInstanceIds,
  listRef,
}: {
  containerRef: RefObject<HTMLElement | null>
  instanceIds: string[]
  layoutInstanceIds: string[]
  listRef: RefObject<HTMLOListElement | null>
}) {
  const outlineRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const container = containerRef.current
    const list = listRef.current
    const outline = outlineRef.current
    if (!container || !list || !outline) return

    const selectedIdSet = new Set(instanceIds)
    const selectedItems = Array.from(
      list.querySelectorAll<HTMLElement>("[data-live-card-id]"),
    ).filter(item => item.dataset.liveCardId && selectedIdSet.has(item.dataset.liveCardId))
    if (selectedItems.length === 0) {
      outline.hidden = true
      return
    }

    const containerRect = container.getBoundingClientRect()
    let left = Number.POSITIVE_INFINITY
    let right = Number.NEGATIVE_INFINITY
    let top = Number.POSITIVE_INFINITY
    let bottom = Number.NEGATIVE_INFINITY
    selectedItems.forEach((item) => {
      const rect = item.getBoundingClientRect()
      left = Math.min(left, rect.left)
      right = Math.max(right, rect.right)
      top = Math.min(top, rect.top)
      bottom = Math.max(bottom, rect.bottom)
    })
    left -= containerRect.left
    right -= containerRect.left
    top -= containerRect.top
    bottom -= containerRect.top
    outline.hidden = false
    outline.style.left = `${left - 6}px`
    outline.style.top = `${top - 6}px`
    outline.style.width = `${right - left + 12}px`
    outline.style.height = `${bottom - top + 12}px`
  }, [containerRef, instanceIds, layoutInstanceIds, listRef])

  return (
    <SquircleBox
      ref={outlineRef}
      aria-hidden="true"
      hidden
      radius="3xl"
      className="pointer-events-none absolute z-10 border border-theme-400 bg-theme-400/10 shadow-sm"
    />
  )
}

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
  const selectionSurfaceRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [entranceComplete, setEntranceComplete] = useState(false)
  const {
    marqueeRect,
    onPointerCancel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    selectedInstanceIds,
    setSelectedInstanceIds,
  } = useMarqueeSelection({ enabled: sortable, instanceIds })
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
      setSelectedInstanceIds(args.source.data.ids)
      setIsDragging(true)
    }
    onDragStart()
  }, [onDragStart, setSelectedInstanceIds])
  const handleDrop = useCallback((args: ElementEventBasePayload) => {
    onDrop(args)
    setSelectedInstanceIds([])
    setIsDragging(false)
  }, [onDrop, setSelectedInstanceIds])
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
      selectedInstanceIds={selectedInstanceIds}
      onDragStart={handleDragStart}
      onDrag={onDrag}
      onDrop={handleDrop}
    >
      <div
        ref={selectionSurfaceRef}
        className="relative"
        onPointerCancel={onPointerCancel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div aria-hidden="true" className="fixed inset-0" />
        <ol
          ref={listRef}
          data-live-card-list
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
                  dragging={isDragging && selectedInstanceIds.includes(id)}
                  instanceAtom={instanceAtom}
                  sortable={sortable}
                />
              </div>
            </m.li>
          ))}
        </ol>
        <SelectionOutline
          containerRef={selectionSurfaceRef}
          instanceIds={selectedInstanceIds}
          layoutInstanceIds={orderedInstanceIds}
          listRef={listRef}
        />
        {marqueeRect && (
          <SquircleBox
            aria-hidden="true"
            radius="3xl"
            className="pointer-events-none absolute z-30 border border-theme-400 bg-theme-400/10 shadow-sm"
            style={marqueeRect}
          />
        )}
      </div>
    </DndContext>
  )
}
