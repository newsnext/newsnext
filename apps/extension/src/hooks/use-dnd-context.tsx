import type { ElementDragType, MonitorArgs } from "@atlaskit/pragmatic-drag-and-drop/types"
import type { PropsWithChildren } from "react"
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { useEffect, useEffectEvent, useId } from "react"
import { isSortableData } from "@/lib/sortable-data"
import { InstanceIdContext } from "./use-sortable"

type ContextProps = Pick<
  MonitorArgs<ElementDragType>,
  "onDragStart" | "onDrag" | "onDropTargetChange" | "onDrop"
>

type MonitorCallbackArgs<Key extends keyof ContextProps> = Parameters<NonNullable<ContextProps[Key]>>[0]

export function DndContext({ children, ...callbacks }: PropsWithChildren<ContextProps>) {
  const instanceId = useId()
  const handleDragStart = useEffectEvent((args: MonitorCallbackArgs<"onDragStart">) => {
    callbacks.onDragStart?.(args)
  })
  const handleDrag = useEffectEvent((args: MonitorCallbackArgs<"onDrag">) => {
    callbacks.onDrag?.(args)
  })
  const handleDropTargetChange = useEffectEvent((args: MonitorCallbackArgs<"onDropTargetChange">) => {
    callbacks.onDropTargetChange?.(args)
  })
  const handleDrop = useEffectEvent((args: MonitorCallbackArgs<"onDrop">) => {
    callbacks.onDrop?.(args)
  })

  useEffect(() => {
    return monitorForElements({
      canMonitor: ({ source }) => isSortableData(source.data)
        && source.data.instanceId === instanceId,
      onDragStart: handleDragStart,
      onDrag: handleDrag,
      onDropTargetChange: handleDropTargetChange,
      onDrop: handleDrop,
    })
  }, [instanceId])

  return (
    <InstanceIdContext value={instanceId}>
      {children}
    </InstanceIdContext>
  )
}
