import type { CardProps } from "./index"
import { useEffect } from "react"
import { isIOS } from "react-device-detect"
import { createPortal } from "react-dom"
import { useSortable } from "@/hooks/use-sortable"
import { cn } from "@/lib/utils"
import { PhDotsSixVerticalDuotone } from "../icons/ph"
import { Button } from "../ui/button"
import { DragOverlay } from "./drag-overlay"
import Card from "./index"

interface DraggableCardProps extends Omit<CardProps, "nodeRef" | "dragHandle"> {
  id: string
}

export function DraggableCard({ id, ...props }: DraggableCardProps) {
  const {
    isDragging,
    setNodeRef,
    setHandleRef,
    OverlayContainer,
  } = useSortable({ id })

  useEffect(() => {
    if (OverlayContainer) {
      OverlayContainer!.className += cn("bg-background/50", !isIOS && "rounded-2xl")
    }
  }, [OverlayContainer])

  const dragHandle = (
    <div
      ref={setHandleRef}
      className="flex items-center justify-center cursor-grab active:cursor-grabbing"
    >
      <Button
        variant="icon"
        size="icon"
        aria-label="Handle"
        asChild
      >
        <PhDotsSixVerticalDuotone />
      </Button>
    </div>
  )

  return (
    <>
      <Card
        id={id}
        nodeRef={setNodeRef}
        dragHandle={dragHandle}
        {...props}
        className={cn(
          isDragging && "opacity-50",
          props.className,
        )}
      />

      {OverlayContainer && createPortal(
        <DragOverlay id={id} />,
        OverlayContainer,
      )}
    </>
  )
}
