import type { ElementEventBasePayload } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import type { RefObject } from "react"
import type { LiveCardLayoutItem } from "@/lib/board/live-card-reorder"
import { useCallback, useRef, useState } from "react"
import { isSortableData } from "@/lib/board"
import { isDropWithin } from "@/lib/board/drop-target"
import { getLiveCardReorderDestinationIndex, reorderLiveCard } from "@/lib/board/live-card-reorder"

interface LiveCardOrderState {
  cardIds: string[]
  orderedCardIds: string[]
}

interface UseWrappedSortableOptions {
  cardIds: string[]
  onCardIdsChange: (cardIds: string[]) => void
}

interface WrappedSortableResult {
  listRef: RefObject<HTMLOListElement | null>
  onDrag: (args: ElementEventBasePayload) => void
  onDragStart: () => void
  onDrop: (args: ElementEventBasePayload) => void
  orderedCardIds: string[]
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
  cardIds,
  onCardIdsChange,
}: UseWrappedSortableOptions): WrappedSortableResult {
  const [cardOrderState, setCardOrderState] = useState<LiveCardOrderState>(() => ({
    cardIds,
    orderedCardIds: cardIds,
  }))
  let orderedCardIds = cardOrderState.orderedCardIds
  if (cardOrderState.cardIds !== cardIds) {
    orderedCardIds = cardIds
    setCardOrderState({
      cardIds,
      orderedCardIds,
    })
  }

  const initialOrderedCardIdsRef = useRef(cardIds)
  const dragLayoutRef = useRef<LiveCardLayoutItem[] | null>(null)
  const destinationIndexRef = useRef<number | null>(null)
  const listRef = useRef<HTMLOListElement>(null)

  const onDragStart = useCallback(() => {
    initialOrderedCardIdsRef.current = orderedCardIds
    const list = listRef.current
    dragLayoutRef.current = list ? snapshotLayout(list) : null
    destinationIndexRef.current = null
  }, [orderedCardIds])

  const onDrag = useCallback(({ location, source }: ElementEventBasePayload) => {
    const list = listRef.current
    const dragLayout = dragLayoutRef.current
    if (!list || !dragLayout || !isSortableData(source.data)) return

    const initialCardIds = initialOrderedCardIdsRef.current
    if (!isDropWithin({ location }, list)) {
      if (destinationIndexRef.current !== null) {
        destinationIndexRef.current = null
        setCardOrderState({ cardIds, orderedCardIds: initialCardIds })
      }
      return
    }

    const listRect = list.getBoundingClientRect()
    if (!initialCardIds.includes(source.data.id)) return

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
    const preview = reorderLiveCard(initialCardIds, source.data.id, destinationIndex)
    setCardOrderState({ cardIds, orderedCardIds: preview })
  }, [cardIds])

  const onDrop = useCallback(({ location, source }: ElementEventBasePayload) => {
    const list = listRef.current
    dragLayoutRef.current = null
    const destinationIndex = destinationIndexRef.current
    destinationIndexRef.current = null
    const initialCardIds = initialOrderedCardIdsRef.current
    if (!isDropWithin({ location }, list) || destinationIndex === null || !isSortableData(source.data)) {
      setCardOrderState({ cardIds, orderedCardIds: initialCardIds })
      return
    }

    const sourceIndex = initialCardIds.indexOf(source.data.id)
    if (sourceIndex === -1 || destinationIndex === sourceIndex) return
    const finalCardIds = reorderLiveCard(initialCardIds, source.data.id, destinationIndex)
    setCardOrderState({
      cardIds,
      orderedCardIds: finalCardIds,
    })
    onCardIdsChange(finalCardIds)
  }, [cardIds, onCardIdsChange])

  return {
    listRef,
    onDrag,
    onDragStart,
    onDrop,
    orderedCardIds,
  }
}
