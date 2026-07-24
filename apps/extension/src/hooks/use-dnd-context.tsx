import type { ElementAutoScrollArgs } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/dist/types/internal-types"
import type { AllEvents, ElementDragType } from "@atlaskit/pragmatic-drag-and-drop/dist/types/internal-types"
import type { PropsWithChildren } from "react"
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element"
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine"
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { useEffect, useId } from "react"
import { InstanceIdContext } from "./use-sortable"

interface ContextProps extends Partial<AllEvents<ElementDragType>> {
  autoscroll?: ElementAutoScrollArgs<ElementDragType>
}

export function DndContext({ children, autoscroll, ...callback }: PropsWithChildren<ContextProps>) {
  const instanceId = useId()

  useEffect(() => {
    return (
      combine(
        monitorForElements({
          canMonitor({ source }) {
            return source.data.instanceId === instanceId
          },
          ...callback,
        }),
        autoscroll ? autoScrollForElements(autoscroll) : () => {},
      )
    )
  }, [callback, instanceId, autoscroll])

  return (
    <InstanceIdContext value={instanceId}>
      {children}
    </InstanceIdContext>
  )
}
