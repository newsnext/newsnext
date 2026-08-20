import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview"
import { createContext, use, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { getSortableData } from "@/lib/board"

interface SortableContextValue {
  instanceId: string | null
  selectedInstanceIds: string[]
}

export const SortableContext = createContext<SortableContextValue>({
  instanceId: null,
  selectedInstanceIds: [],
})

interface SortableProps {
  enabled?: boolean
  id: string
  onGenerateDragPreview?: (args: {
    container: HTMLElement
    draggedIds: string[]
    elements: HTMLElement[]
  }) => void | (() => void)
}

export function useSortable({ enabled = true, id, onGenerateDragPreview }: SortableProps) {
  const { instanceId, selectedInstanceIds } = use(SortableContext)
  const selectedInstanceIdsRef = useRef(selectedInstanceIds)
  const [handleRef, setHandleRef] = useState<HTMLElement | null>(null)
  const [nodeRef, setNodeRef] = useState<HTMLElement | null>(null)
  useLayoutEffect(() => {
    selectedInstanceIdsRef.current = selectedInstanceIds
  }, [selectedInstanceIds])
  const getDraggedIds = useCallback(
    () => selectedInstanceIdsRef.current.includes(id)
      ? selectedInstanceIdsRef.current
      : [id],
    [id],
  )

  useEffect(() => {
    if (enabled && handleRef && nodeRef && instanceId) {
      return draggable({
        element: nodeRef,
        dragHandle: handleRef,
        getInitialData: () => getSortableData({ id, ids: getDraggedIds(), instanceId }),
        onGenerateDragPreview({ nativeSetDragImage, location }) {
          const draggedIds = getDraggedIds()
          const draggedIdSet = new Set(draggedIds)
          const dragOrder = new Map(draggedIds.map((draggedId, index) => [draggedId, index]))
          const elements = Array.from(
            nodeRef.closest("[data-live-card-list]")?.querySelectorAll<HTMLElement>("[data-live-card-id]") ?? [],
          ).filter(item => item.dataset.liveCardId && draggedIdSet.has(item.dataset.liveCardId))
          elements.sort((first, second) => (
            (dragOrder.get(first.dataset.liveCardId ?? "") ?? 0)
            - (dragOrder.get(second.dataset.liveCardId ?? "") ?? 0)
          ))
          setCustomNativeDragPreview({
            getOffset({ container }) {
              const sourceRect = nodeRef.getBoundingClientRect()
              const containerRect = container.getBoundingClientRect()
              const sourcePreview = Array.from(
                container.querySelectorAll<HTMLElement>("[data-drag-preview-id]"),
              ).find(preview => preview.dataset.dragPreviewId === id)
              const previewRect = sourcePreview?.getBoundingClientRect() ?? containerRect
              const previewScale = Number(sourcePreview?.dataset.dragPreviewScale ?? 1)
              return {
                x: previewRect.left - containerRect.left + Math.min(
                  Math.max((location.current.input.clientX - sourceRect.left) * previewScale, 0),
                  previewRect.width,
                ),
                y: previewRect.top - containerRect.top + Math.min(
                  Math.max((location.current.input.clientY - sourceRect.top) * previewScale, 0),
                  previewRect.height,
                ),
              }
            },
            render({ container }) {
              return onGenerateDragPreview?.({
                container,
                draggedIds,
                elements: elements.length > 0 ? elements : [nodeRef],
              })
            },
            nativeSetDragImage,
          })
        },
      })
    }
  }, [enabled, getDraggedIds, handleRef, id, instanceId, nodeRef, onGenerateDragPreview])

  return {
    setHandleRef,
    setNodeRef,
  }
}
