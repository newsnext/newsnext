import { attachClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine"
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { preserveOffsetOnSource } from "@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source"
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview"
import { createContext, use, useEffect, useState } from "react"
import { getSortableData, isSortableData } from "@/lib/sortable-data"

export const InstanceIdContext = createContext<string | null>(null)

interface SortableProps {
  enabled?: boolean
  id: string
  onGenerateDragPreview?: (args: {
    container: HTMLElement
    element: HTMLElement
  }) => void | (() => void)
}

export function useSortable({ enabled = true, id, onGenerateDragPreview }: SortableProps) {
  const instanceId = use(InstanceIdContext)
  const [isDragging, setIsDragging] = useState(false)
  const [handleRef, setHandleRef] = useState<HTMLElement | null>(null)
  const [nodeRef, setNodeRef] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (enabled && handleRef && nodeRef && instanceId) {
      const sortableData = getSortableData({ id, instanceId })
      const cleanup = combine(
        draggable({
          element: nodeRef,
          dragHandle: handleRef,
          getInitialData: () => sortableData,
          onGenerateDragPreview({ nativeSetDragImage, location }) {
            setCustomNativeDragPreview({
              getOffset: preserveOffsetOnSource({
                element: nodeRef,
                input: location.current.input,
              }),
              render({ container }) {
                return onGenerateDragPreview?.({ container, element: nodeRef })
              },
              nativeSetDragImage,
            })
          },
          onDragStart: () => {
            setIsDragging(true)
          },
          onDrop: () => {
            setIsDragging(false)
          },
        }),
        dropTargetForElements({
          element: nodeRef,
          getData: ({ element, input }) => attachClosestEdge(
            sortableData,
            {
              element,
              input,
              allowedEdges: ["top", "right", "bottom", "left"],
            },
          ),
          getIsSticky: () => true,
          canDrop: ({ source }) => isSortableData(source.data)
            && source.data.instanceId === instanceId,
        }),
      )
      return cleanup
    }
  }, [enabled, handleRef, id, instanceId, nodeRef, onGenerateDragPreview])

  return {
    setHandleRef,
    setNodeRef,
    isDragging,
  }
}
