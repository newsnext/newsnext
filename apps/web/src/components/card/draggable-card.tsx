import type { CardProps } from "./index"
import type { BoardSource } from "@/typings/source"
import { useCallback, useMemo } from "react"
import { createRoot } from "react-dom/client"
import { useSortable } from "@/hooks/use-sortable"
import { cn } from "@/lib/utils"
import { IconButton } from "../common/button"
import { PhDotsSixVerticalDuotone } from "../icons/ph"
import { DragOverlay } from "./drag-overlay"
import Card from "./index"

interface DraggableCardProps extends Omit<CardProps, "nodeRef" | "dragHandle"> {
  id: string
  source: BoardSource
}

export function DraggableCard({ id, source, ...props }: DraggableCardProps) {
  const onGenerateDragPreview = useCallback(
    ({ container, element }: { container: HTMLElement, element: HTMLElement }) => {
      container.style.width = `${element.clientWidth}px`
      container.className = cn("bg-background")

      const root = createRoot(container)
      root.render(<DragOverlay source={source} />)
      return () => root.unmount()
    },
    [source],
  )

  const { isDragging, setNodeRef, setHandleRef } = useSortable({
    id,
    onGenerateDragPreview,
  })

  const dragHandle = useMemo(
    () => (
      <div ref={setHandleRef} className="flex items-center justify-center">
        <IconButton
          aria-label="Handle"
          className="cursor-grab active:cursor-grabbing"
        >
          <PhDotsSixVerticalDuotone />
        </IconButton>
      </div>
    ),
    [],
  )

  return (
    <Card
      id={id}
      source={source}
      nodeRef={setNodeRef}
      dragHandle={dragHandle}
      {...props}
      className={cn(isDragging && "opacity-50", props.className)}
    />
  )
}
