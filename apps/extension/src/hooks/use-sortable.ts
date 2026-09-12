import type { SortableKind } from "@/lib/board/sortable-data"
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { preserveOffsetOnSource } from "@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source"
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview"
import { createContext, use, useEffect, useState } from "react"
import { getSortableData } from "@/lib/board"

export const SortableContext = createContext<string | null>(null)

interface SortableProps {
  kind?: SortableKind
  boardId?: string
  liveWidgetId?: string
  canDrag?: (target: Element | null) => boolean
  enabled?: boolean
  id: string
  onGenerateDragPreview?: (args: {
    container: HTMLElement
    element: HTMLElement
  }) => void | (() => void)
}

export function useSortable({ canDrag, enabled = true, id, kind = "card", boardId, liveWidgetId, onGenerateDragPreview }: SortableProps) {
  const cardId = use(SortableContext)
  const [handleRef, setHandleRef] = useState<HTMLElement | null>(null)
  const [nodeRef, setNodeRef] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (enabled && handleRef && nodeRef && cardId) {
      return draggable({
        element: nodeRef,
        dragHandle: handleRef,
        canDrag: canDrag
          ? ({ input }) => canDrag(document.elementFromPoint(input.clientX, input.clientY))
          : undefined,
        getInitialData: () => getSortableData({ id, cardId, kind, boardId, liveWidgetId }),
        onGenerateDragPreview({ nativeSetDragImage, location }) {
          setCustomNativeDragPreview({
            getOffset: preserveOffsetOnSource({
              element: nodeRef,
              input: location.current.input,
            }),
            render({ container }) {
              return onGenerateDragPreview?.({
                container,
                element: nodeRef,
              })
            },
            nativeSetDragImage,
          })
        },
      })
    }
  }, [boardId, liveWidgetId, canDrag, enabled, handleRef, id, cardId, kind, nodeRef, onGenerateDragPreview])

  return {
    setHandleRef,
    setNodeRef,
  }
}
