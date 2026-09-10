import type { ElementEventBasePayload } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import type { ElementDragType, MonitorArgs } from "@atlaskit/pragmatic-drag-and-drop/types"
import type { PropsWithChildren, RefObject } from "react"
import type { SortableKind } from "@/lib/board/sortable-data"
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element"
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
  kind?: SortableKind
  dropTargetRef?: RefObject<HTMLElement | null>
  verticalScrollRef?: RefObject<HTMLElement | null>
  horizontalScrollRef?: RefObject<HTMLElement | null>
  scrollSpeed?: "standard" | "fast"
}

type MonitorCallbackArgs<Key extends keyof MonitorCallbacks> = Parameters<NonNullable<MonitorCallbacks[Key]>>[0]

export function DndContext({
  children,
  dropTargetRef,
  kind = "card",
  verticalScrollRef,
  horizontalScrollRef,
  scrollSpeed = "standard",
  ...callbacks
}: PropsWithChildren<ContextProps>) {
  const cardId = useId()
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
    const dropTarget = dropTargetRef?.current
    const ownsDrag = ({ source }: Pick<ElementEventBasePayload, "source">) => isSortableData(source.data, kind)
      && source.data.cardId === cardId
    const monitorCleanup = monitorForElements({
      canMonitor: ownsDrag,
      onDragStart: handleDragStart,
      onDrag: handleDrag,
      onDrop: handleDrop,
    })
    if (!dropTarget) return monitorCleanup

    return combine(
      monitorCleanup,
      ...([
        [verticalScrollRef?.current, "vertical"],
        [horizontalScrollRef?.current, "horizontal"],
      ] as const).flatMap(([element, axis]) => element
        ? [autoScrollForElements({
            element,
            canScroll: ownsDrag,
            getAllowedAxis: () => axis,
            getConfiguration: () => ({ maxScrollSpeed: scrollSpeed }),
          })]
        : []),
      dropTargetForElements({
        element: dropTarget,
        canDrop: ownsDrag,
      }),
    )
  }, [dropTargetRef, horizontalScrollRef, cardId, kind, scrollSpeed, verticalScrollRef])

  return (
    <SortableContext value={cardId}>
      {children}
    </SortableContext>
  )
}
