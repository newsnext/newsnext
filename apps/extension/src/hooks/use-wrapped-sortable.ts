import type { ElementEventBasePayload } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import type { RefObject } from "react"
import type { LiveCardLayoutItem } from "@/lib/board/live-card-reorder"
import { useCallback, useRef, useState } from "react"
import { isSortableData } from "@/lib/board"
import { isDropWithin } from "@/lib/board/drop-target"
import { getLiveCardReorderDestinationIndex, reorderLiveCard } from "@/lib/board/live-card-reorder"

interface InstanceOrderState {
  instanceIds: string[]
  orderedInstanceIds: string[]
}

interface UseWrappedSortableOptions {
  instanceIds: string[]
  onInstanceIdsChange: (instanceIds: string[]) => void
}

interface WrappedSortableResult {
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

export function useWrappedSortable({
  instanceIds,
  onInstanceIdsChange,
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
  const listRef = useRef<HTMLOListElement>(null)

  const onDragStart = useCallback(() => {
    initialOrderedInstanceIdsRef.current = orderedInstanceIds
    const list = listRef.current
    dragLayoutRef.current = list ? snapshotLayout(list) : null
    destinationIndexRef.current = null
  }, [orderedInstanceIds])

  const onDrag = useCallback(({ location, source }: ElementEventBasePayload) => {
    const list = listRef.current
    const dragLayout = dragLayoutRef.current
    if (!list || !dragLayout || !isSortableData(source.data)) return

    const initialInstanceIds = initialOrderedInstanceIdsRef.current
    if (!isDropWithin({ location }, list)) {
      if (destinationIndexRef.current !== null) {
        destinationIndexRef.current = null
        setInstanceOrderState({ instanceIds, orderedInstanceIds: initialInstanceIds })
      }
      return
    }

    const listRect = list.getBoundingClientRect()
    if (!initialInstanceIds.includes(source.data.id)) return

    const destinationIndex = getLiveCardReorderDestinationIndex({
      items: dragLayout,
      sourceId: source.data.id,
      pointer: {
        x: location.current.input.clientX - listRect.left,
        y: location.current.input.clientY - listRect.top,
      },
    })
    if (destinationIndexRef.current === destinationIndex) return
    destinationIndexRef.current = destinationIndex
    const preview = reorderLiveCard(initialInstanceIds, source.data.id, destinationIndex)
    setInstanceOrderState({ instanceIds, orderedInstanceIds: preview })
  }, [instanceIds])

  const onDrop = useCallback(({ location, source }: ElementEventBasePayload) => {
    const list = listRef.current
    dragLayoutRef.current = null
    const destinationIndex = destinationIndexRef.current
    destinationIndexRef.current = null
    const initialInstanceIds = initialOrderedInstanceIdsRef.current
    if (!isDropWithin({ location }, list) || destinationIndex === null || !isSortableData(source.data)) {
      setInstanceOrderState({ instanceIds, orderedInstanceIds: initialInstanceIds })
      return
    }

    const sourceIndex = initialInstanceIds.indexOf(source.data.id)
    if (sourceIndex === -1 || destinationIndex === sourceIndex) return
    const finalInstanceIds = reorderLiveCard(initialInstanceIds, source.data.id, destinationIndex)
    setInstanceOrderState({
      instanceIds,
      orderedInstanceIds: finalInstanceIds,
    })
    onInstanceIdsChange(finalInstanceIds)
  }, [instanceIds, onInstanceIdsChange])

  return {
    listRef,
    onDrag,
    onDragStart,
    onDrop,
    orderedInstanceIds,
  }
}
