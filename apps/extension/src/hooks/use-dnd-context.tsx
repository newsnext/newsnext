import type { ElementDragType, MonitorArgs } from "@atlaskit/pragmatic-drag-and-drop/types"
import type { PropsWithChildren } from "react"
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { useEffect, useId, useRef } from "react"
import { isSortableData } from "@/lib/sortable-data"
import { InstanceIdContext } from "./use-sortable"

type ContextProps = Pick<
  MonitorArgs<ElementDragType>,
  "onDragStart" | "onDrag" | "onDropTargetChange" | "onDrop"
>

export function DndContext({ children, ...callbacks }: PropsWithChildren<ContextProps>) {
  const instanceId = useId()
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  useEffect(() => {
    return monitorForElements({
      canMonitor: ({ source }) => isSortableData(source.data)
        && source.data.instanceId === instanceId,
      onDragStart: args => callbacksRef.current.onDragStart?.(args),
      onDrag: args => callbacksRef.current.onDrag?.(args),
      onDropTargetChange: args => callbacksRef.current.onDropTargetChange?.(args),
      onDrop: args => callbacksRef.current.onDrop?.(args),
    })
  }, [instanceId])

  return (
    <InstanceIdContext value={instanceId}>
      {children}
    </InstanceIdContext>
  )
}
