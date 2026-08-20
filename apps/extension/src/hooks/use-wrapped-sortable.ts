import type { ElementEventBasePayload } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import type { RefObject } from "react"
import type { LiveCardLayoutItem } from "@/lib/board/live-card-reorder"
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element"
import { useCallback, useEffect, useRef, useState } from "react"
import { isSortableData } from "@/lib/board"
import { getLiveCardReorderDestinationIndex, reorderLiveCardGroup } from "@/lib/board/live-card-reorder"

interface InstanceOrderState {
  instanceIds: string[]
  orderedInstanceIds: string[]
}

interface UseWrappedSortableOptions {
  enabled: boolean
  instanceIds: string[]
  onInstanceIdsChange: (instanceIds: string[]) => void
  scrollContainerRef: RefObject<HTMLElement | null>
}

interface InsertionIndicator {
  edge: "left" | "right"
  id: string
}

interface WrappedSortableResult {
  insertionIndicator: InsertionIndicator | null
  listRef: RefObject<HTMLOListElement | null>
  onDrag: (args: ElementEventBasePayload) => void
  onDragStart: () => void
  onDrop: (args: ElementEventBasePayload) => void
  orderedInstanceIds: string[]
}

function snapshotLayout(list: HTMLOListElement): LiveCardLayoutItem[] {
  const listRect = list.getBoundingClientRect()
  return Array.from(list.querySelectorAll<HTMLElement>("[data-live-card-id]"))
    .flatMap((item) => {
      const id = item.dataset.liveCardId
      if (!id) return []
      const rect = item.getBoundingClientRect()
      return [{
        id,
        top: rect.top - listRect.top,
        right: rect.right - listRect.left,
        bottom: rect.bottom - listRect.top,
        left: rect.left - listRect.left,
      }]
    })
}

function hasSameOrder(first: string[], second: string[]): boolean {
  return first.length === second.length && first.every((id, index) => second[index] === id)
}

function getDraggedInstanceIds(instanceIds: string[], draggedIds: string[]): string[] {
  const draggedIdSet = new Set(draggedIds)
  return instanceIds.filter(id => draggedIdSet.has(id))
}

export function useWrappedSortable({
  enabled,
  instanceIds,
  onInstanceIdsChange,
  scrollContainerRef,
}: UseWrappedSortableOptions): WrappedSortableResult {
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

  const initialOrderedInstanceIdsRef = useRef(instanceIds)
  const dragLayoutRef = useRef<LiveCardLayoutItem[] | null>(null)
  const destinationIndexRef = useRef<number | null>(null)
  const [insertionIndicator, setInsertionIndicator] = useState<InsertionIndicator | null>(null)
  const listRef = useRef<HTMLOListElement>(null)

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!enabled || !scrollContainer) return

    return autoScrollForElements({
      element: scrollContainer,
      canScroll: ({ source }) => isSortableData(source.data),
      getAllowedAxis: () => "vertical",
      getConfiguration: () => ({ maxScrollSpeed: "fast" }),
    })
  }, [enabled, scrollContainerRef])

  const onDragStart = useCallback(() => {
    initialOrderedInstanceIdsRef.current = orderedInstanceIds
    const list = listRef.current
    dragLayoutRef.current = list ? snapshotLayout(list) : null
    destinationIndexRef.current = null
    setInsertionIndicator(null)
  }, [orderedInstanceIds])

  const onDrag = useCallback(({ location, source }: ElementEventBasePayload) => {
    const list = listRef.current
    const dragLayout = dragLayoutRef.current
    if (!list || !dragLayout || !isSortableData(source.data)) return

    const listRect = list.getBoundingClientRect()
    const initialInstanceIds = initialOrderedInstanceIdsRef.current
    const sourceIds = getDraggedInstanceIds(initialInstanceIds, source.data.ids)
    if (sourceIds.length === 0) return

    const destinationIndex = getLiveCardReorderDestinationIndex({
      items: dragLayout,
      sourceIds,
      pointer: {
        x: location.current.input.clientX - listRect.left,
        y: location.current.input.clientY - listRect.top,
      },
    })
    destinationIndexRef.current = destinationIndex
    const nextInstanceIds = reorderLiveCardGroup(initialInstanceIds, sourceIds, destinationIndex)
    if (hasSameOrder(nextInstanceIds, initialInstanceIds)) {
      setInsertionIndicator(null)
      return
    }

    const sourceIdSet = new Set(sourceIds)
    const remainingInstanceIds = initialInstanceIds.filter(id => !sourceIdSet.has(id))
    const beforeId = remainingInstanceIds[destinationIndex]
    const nextIndicator: InsertionIndicator = beforeId
      ? { edge: "left", id: beforeId }
      : { edge: "right", id: remainingInstanceIds.at(-1) ?? source.data.id }
    setInsertionIndicator(current => (
      current?.edge === nextIndicator.edge && current.id === nextIndicator.id
        ? current
        : nextIndicator
    ))
  }, [])

  const onDrop = useCallback(({ location, source }: ElementEventBasePayload) => {
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

    dragLayoutRef.current = null
    const destinationIndex = destinationIndexRef.current
    destinationIndexRef.current = null
    setInsertionIndicator(null)
    const initialInstanceIds = initialOrderedInstanceIdsRef.current
    if (!hasDropTarget || !isInsideList || destinationIndex === null || !isSortableData(source.data)) return

    const sourceIds = getDraggedInstanceIds(initialInstanceIds, source.data.ids)
    const finalInstanceIds = reorderLiveCardGroup(initialInstanceIds, sourceIds, destinationIndex)
    if (!hasSameOrder(finalInstanceIds, initialInstanceIds)) {
      setInstanceOrderState({
        instanceIds,
        orderedInstanceIds: finalInstanceIds,
      })
      onInstanceIdsChange(finalInstanceIds)
    }
  }, [instanceIds, onInstanceIdsChange])

  return {
    insertionIndicator,
    listRef,
    onDrag,
    onDragStart,
    onDrop,
    orderedInstanceIds,
  }
}
