import type { CardProps } from "./index"
import type { Source } from "@/typings/source"
import { useEffect } from "react"
import { isIOS } from "react-device-detect"
import { createPortal } from "react-dom"
import { useSortable } from "@/hooks/use-sortable"
import { cn } from "@/lib/utils"
import { PhDotsSixVerticalDuotone } from "../icons/ph"
import { DragOverlay } from "./drag-overlay"
import Card from "./index"
import { IconButton } from "../common/button";

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

  const dragHandle = (
    <div
      ref={setHandleRef}
      className="flex items-center justify-center cursor-grab active:cursor-grabbing"
    >
      <IconButton
        aria-label="Handle"
      >
        <PhDotsSixVerticalDuotone />
      </IconButton>
    </div>
  )

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
