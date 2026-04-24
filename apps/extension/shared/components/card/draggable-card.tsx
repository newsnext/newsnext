import type { CardProps } from "./index"
import type { BoardFeed } from "@/typings/feed"
import { useCallback, useMemo } from "react"
import { isIOS } from "react-device-detect"
import { createRoot } from "react-dom/client"
import { useSortable } from "@/hooks/use-sortable"
import { getSavedFeedParamValues } from "@/lib/feed-params"
import { cn } from "@/lib/utils"
import { IconButton } from "../common/button"
import { PhDotsSixVerticalDuotone } from "../icons/ph"
import { DragOverlay } from "./drag-overlay"
import Card from "./index"

interface DraggableCardProps extends Omit<CardProps, "nodeRef" | "dragHandle"> {
  id: string
  feed: BoardFeed
}

export function DraggableCard({ id, feed, ...props }: DraggableCardProps) {
  const onGenerateDragPreview = useCallback(
    ({ container, element }: { container: HTMLElement, element: HTMLElement }) => {
      container.style.width = `${element.clientWidth}px`
      container.className = cn("bg-background", !isIOS && "rounded-4xl")

      const root = createRoot(container)
      const feedParams = getSavedFeedParamValues(id, feed.params)
      root.render(<DragOverlay feed={feed} feedParams={feedParams} />)
      return () => root.unmount()
    },
    [id, feed],
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
      feed={feed}
      nodeRef={setNodeRef}
      dragHandle={dragHandle}
      {...props}
      className={cn(isDragging && "opacity-50", props.className)}
    />
  )
}
