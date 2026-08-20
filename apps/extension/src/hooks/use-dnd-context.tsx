import type { ElementDragType, MonitorArgs } from "@atlaskit/pragmatic-drag-and-drop/types"
import type { PropsWithChildren, RefObject } from "react"
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine"
import { dropTargetForElements, monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { useEffect, useEffectEvent, useId } from "react"
import { isSortableData } from "@/lib/board"
import { SortableContext } from "./use-sortable"

type MonitorCallbacks = Pick<
  MonitorArgs<ElementDragType>,
  "onDragStart" | "onDrag" | "onDrop"
>

type ContextProps = MonitorCallbacks & {
  dropTargetRef: RefObject<HTMLElement | null>
  selectedInstanceIds: string[]
}

type MonitorCallbackArgs<Key extends keyof MonitorCallbacks> = Parameters<NonNullable<MonitorCallbacks[Key]>>[0]

export function DndContext({ children, dropTargetRef, selectedInstanceIds, ...callbacks }: PropsWithChildren<ContextProps>) {
  const instanceId = useId()
  const handleDragStart = useEffectEvent((args: MonitorCallbackArgs<"onDragStart">) => {
    callbacks.onDragStart?.(args)
  })
  const handleDrag = useEffectEvent((args: MonitorCallbackArgs<"onDrag">) => {
    callbacks.onDrag?.(args)
  })
  const handleDrop = useEffectEvent((args: MonitorCallbackArgs<"onDrop">) => {
    callbacks.onDrop?.(args)
  })

  useEffect(() => {
    const dropTarget = dropTargetRef.current
    const monitorCleanup = monitorForElements({
      canMonitor: ({ source }) => isSortableData(source.data)
        && source.data.instanceId === instanceId,
      onDragStart: handleDragStart,
      onDrag: handleDrag,
      onDrop: handleDrop,
    })
    if (!dropTarget) return monitorCleanup

    return combine(
      monitorCleanup,
      dropTargetForElements({
        element: dropTarget,
        canDrop: ({ source }) => isSortableData(source.data)
          && source.data.instanceId === instanceId,
      }),
    )
  }, [dropTargetRef, instanceId])

  return (
    <SortableContext value={{ instanceId, selectedInstanceIds }}>
      {children}
    </SortableContext>
  )
}
