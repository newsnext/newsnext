import type { CardProps } from "./index"
import type { Source } from "@/typings/source"
import { useEffect, useMemo } from "react"
import { isIOS } from "react-device-detect"
import { createPortal } from "react-dom"
import { useSortable } from "@/hooks/use-sortable"
import { cn } from "@/lib/utils"
import { IconButton } from "../common/button"
import { PhDotsSixVerticalDuotone } from "../icons/ph"
import { DragOverlay } from "./drag-overlay"
import Card from "./index"

interface DraggableCardProps extends Omit<CardProps, "nodeRef" | "dragHandle"> {
  id: string
  source: Source & { id: string }
}

export function DraggableCard({ id, source, ...props }: DraggableCardProps) {
  const {
    isDragging,
    setNodeRef,
    setHandleRef,
    OverlayContainer,
  } = useSortable({ id })

  useEffect(() => {
    if (OverlayContainer) {
      OverlayContainer!.className += cn("bg-background", !isIOS && "rounded-2xl")
    }
  }, [OverlayContainer])

  const dragHandle = useMemo(() => (
    <div
      ref={setHandleRef}
      className="flex items-center justify-center"
    >
      <IconButton
        aria-label="Handle"
        className="cursor-grab active:cursor-grabbing"
      >
        <PhDotsSixVerticalDuotone />
      </IconButton>
    </div>
  ), [])

  return (
    <>
      <Card
        id={id}
        source={source}
        nodeRef={setNodeRef}
        dragHandle={dragHandle}
        {...props}
        className={cn(
          isDragging && "opacity-50",
          props.className,
        )}
      />

      {OverlayContainer && createPortal(
        <DragOverlay id={id} source={source} />,
        OverlayContainer,
      )}
    </>
  )
}
