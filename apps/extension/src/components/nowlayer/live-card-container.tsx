import type { ElementEventBasePayload } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import type { BoardLiveCard } from "@/hooks/use-board-live-cards"
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"
import { getReorderDestinationIndex } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index"
import { m } from "motion/react"
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react"
import { getCardEntranceStyle } from "@/components/board-view/card-entrance-config"
import { DndContext } from "@/hooks/use-dnd-context"
import { isSortableData } from "@/lib/board"
import { reorder } from "@/lib/utils/reorder"
import { DraggableLiveCard } from "../live-card/draggable-live-card"

interface InstanceOrderState {
  instanceIds: string[]
  orderedInstanceIds: string[]
}

interface LiveCardContainerProps {
  instanceIds: string[]
  liveCardsByInstanceId: Record<string, BoardLiveCard>
  sortable?: boolean
  className?: string
  onInstanceIdsChange: (instanceIds: string[]) => void
}

export function LiveCardContainer({
  instanceIds,
  liveCardsByInstanceId,
  sortable = true,
  className,
  onInstanceIdsChange,
}: LiveCardContainerProps) {
  const [instanceOrderState, setInstanceOrderState] = useState<InstanceOrderState>(() => ({
    instanceIds,
    orderedInstanceIds: instanceIds,
  }))
  let orderedInstanceIds = instanceOrderState.orderedInstanceIds
  if (instanceOrderState.instanceIds !== instanceIds) {
    orderedInstanceIds = instanceIds
    setInstanceOrderState({
      instanceIds,
      orderedInstanceIds,
    })
  }
  const orderedInstanceIdsRef = useRef(orderedInstanceIds)
  const initialOrderedInstanceIdsRef = useRef(instanceIds)
  const listRef = useRef<HTMLOListElement>(null)
  const visibleLiveCards = useMemo(
    () => orderedInstanceIds.flatMap((id) => {
      const liveCard = liveCardsByInstanceId[id]
      return liveCard ? [{ id, ...liveCard }] : []
    }),
    [orderedInstanceIds, liveCardsByInstanceId],
  )

  useLayoutEffect(() => {
    orderedInstanceIdsRef.current = orderedInstanceIds
  }, [orderedInstanceIds])

  const onDragStart = useCallback(() => {
    initialOrderedInstanceIdsRef.current = orderedInstanceIdsRef.current
  }, [])

  const onDrag = useCallback(({ location, source }: ElementEventBasePayload) => {
    const target = location.current.dropTargets[0]
    if (!target || !isSortableData(source.data) || !isSortableData(target.data)) return

    const fromId = source.data.id
    const toId = target.data.id
    const currentInstanceIds = orderedInstanceIdsRef.current
    const fromIndex = currentInstanceIds.indexOf(fromId)
    const toIndex = currentInstanceIds.indexOf(toId)
    if (fromIndex === toIndex || fromIndex === -1 || toIndex === -1) return

    const closestEdge = extractClosestEdge(target.data)
    const normalizedEdge = closestEdge === "top" || closestEdge === "left"
      ? "left"
      : "right"
    const destinationIndex = getReorderDestinationIndex({
      startIndex: fromIndex,
      indexOfTarget: toIndex,
      closestEdgeOfTarget: normalizedEdge,
      axis: "horizontal",
    })
    if (fromIndex === destinationIndex) return

    const nextInstanceIds = reorder(currentInstanceIds, fromIndex, destinationIndex)
    orderedInstanceIdsRef.current = nextInstanceIds
    setInstanceOrderState(prev => ({
      ...prev,
      orderedInstanceIds: nextInstanceIds,
    }))
  }, [])

  const onDrop = useCallback(({ location }: ElementEventBasePayload) => {
    const list = listRef.current
    const { clientX, clientY } = location.current.input
    const listRect = list?.getBoundingClientRect()
    const hasDropTarget = location.current.dropTargets.length > 0
    const isInsideList = Boolean(
      listRect
      && clientX >= listRect.left
      && clientX <= listRect.right
      && clientY >= listRect.top
      && clientY <= listRect.bottom,
    )

    if (!hasDropTarget || !isInsideList) {
      const initialInstanceIds = initialOrderedInstanceIdsRef.current
      orderedInstanceIdsRef.current = initialInstanceIds
      setInstanceOrderState(prev => ({
        ...prev,
        orderedInstanceIds: initialInstanceIds,
      }))
      return
    }

    const finalInstanceIds = orderedInstanceIdsRef.current
    const initialInstanceIds = initialOrderedInstanceIdsRef.current
    const hasOrderChanged = finalInstanceIds.length !== initialInstanceIds.length || finalInstanceIds.some(
      (id, index) => initialInstanceIds[index] !== id,
    )
    if (!hasOrderChanged) {
      return
    }

    onInstanceIdsChange(finalInstanceIds)
  }, [onInstanceIdsChange])

  return (
    <DndContext
      onDragStart={onDragStart}
      onDrag={onDrag}
      onDropTargetChange={onDrag}
      onDrop={onDrop}
    >
      <ol
        ref={listRef}
        className={className || "flex flex-wrap justify-center gap-2 sm:gap-6"}
      >
        {visibleLiveCards.map(({ id, collectionId, descriptor, instanceAtom }, index) => (
          <m.li
            key={id}
            data-live-card-id={id}
            layout
          >
            <div
              className="layer-card-entrance"
              style={getCardEntranceStyle(index)}
            >
              <DraggableLiveCard
                collectionId={collectionId}
                descriptor={descriptor}
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
