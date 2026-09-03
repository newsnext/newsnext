import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview"
import { createContext, use, useEffect, useState } from "react"
import { getSortableData } from "@/lib/board"

export const SortableContext = createContext<string | null>(null)

interface SortableProps {
  canDrag?: (target: Element | null) => boolean
  enabled?: boolean
  id: string
  onGenerateDragPreview?: (args: {
    container: HTMLElement
    element: HTMLElement
  }) => void | (() => void)
}

export function useSortable({ canDrag, enabled = true, id, onGenerateDragPreview }: SortableProps) {
  const instanceId = use(SortableContext)
  const [handleRef, setHandleRef] = useState<HTMLElement | null>(null)
  const [nodeRef, setNodeRef] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (enabled && handleRef && nodeRef && instanceId) {
      return draggable({
        element: nodeRef,
        dragHandle: handleRef,
        canDrag: canDrag
          ? ({ input }) => canDrag(document.elementFromPoint(input.clientX, input.clientY))
          : undefined,
        getInitialData: () => getSortableData({ id, instanceId }),
        onGenerateDragPreview({ nativeSetDragImage, location }) {
          setCustomNativeDragPreview({
            getOffset({ container }) {
              const sourceRect = nodeRef.getBoundingClientRect()
              const containerRect = container.getBoundingClientRect()
              const sourcePreview = container.querySelector<HTMLElement>("[data-drag-preview]")
              const previewRect = sourcePreview?.getBoundingClientRect() ?? containerRect
              return {
                x: previewRect.left - containerRect.left + Math.min(
                  Math.max(location.current.input.clientX - sourceRect.left, 0),
                  previewRect.width,
                ),
                y: previewRect.top - containerRect.top + Math.min(
                  Math.max(location.current.input.clientY - sourceRect.top, 0),
                  previewRect.height,
                ),
              }
            },
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
  }, [canDrag, enabled, handleRef, id, instanceId, nodeRef, onGenerateDragPreview])

  return {
    setHandleRef,
    setNodeRef,
  }
}
