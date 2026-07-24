import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine"
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { preserveOffsetOnSource } from "@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source"
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview"
import { createContext, use, useEffect, useState } from "react"

export const InstanceIdContext = createContext<string | null>(null)

interface SortableProps {
  id: string
  onGenerateDragPreview?: (args: {
    container: HTMLElement
    element: HTMLElement
  }) => void | (() => void)
}

interface DraggableState {
  type: "idle" | "dragging"
}

export function useSortable({ id, onGenerateDragPreview }: SortableProps) {
  const instanceId = use(InstanceIdContext)
  const [draggableState, setDraggableState] = useState<DraggableState>({
    type: "idle",
  })

  useEffect(() => {
    if (draggableState.type === "idle") {
      document.querySelector("html")?.classList.remove("grabbing")
    } else if (draggableState.type === "dragging") {
      // https://github.com/SortableJS/Vue.Draggable/issues/815#issuecomment-1552904628
      const timer = setTimeout(() => {
        document.querySelector("html")?.classList.add("grabbing")
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [draggableState])

  const [handleRef, setHandleRef] = useState<HTMLElement | null>(null)
  const [nodeRef, setNodeRef] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (handleRef && nodeRef) {
      const cleanup = combine(
        draggable({
          element: nodeRef,
          dragHandle: handleRef,
          getInitialData: () => ({ id, instanceId }),
          onGenerateDragPreview({ nativeSetDragImage, location }) {
            setCustomNativeDragPreview({
              getOffset: preserveOffsetOnSource({
                element: nodeRef,
                input: location.current.input,
              }),
              render({ container }) {
                setDraggableState({ type: "dragging" })
                return onGenerateDragPreview?.({ container, element: nodeRef })
              },
              nativeSetDragImage,
            })
          },
          onDrop: () => {
            setDraggableState({ type: "idle" })
          },
        }),
        dropTargetForElements({
          element: nodeRef,
          getData: () => ({ id }),
          getIsSticky: () => true,
          canDrop: ({ source }) => source.data.instanceId === instanceId,
        }),
      )
      return cleanup
    }
  }, [handleRef, id, instanceId, nodeRef, onGenerateDragPreview])

  return {
    setHandleRef,
    setNodeRef,
    isDragging: draggableState.type === "dragging",
  }
}
