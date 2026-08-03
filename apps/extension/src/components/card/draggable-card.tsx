import type { CardProps } from "./index"
import { Button } from "@newsnext/ui/components/button"
import { useSortable } from "@/hooks/use-sortable"
import { cn } from "@/lib/utils"
import { PhDotsSixVerticalDuotone } from "../icons/ph"
import Card from "./index"

type DraggableCardProps = Omit<CardProps, "nodeRef" | "dragHandle">

function generateDragPreview({ container, element }: { container: HTMLElement, element: HTMLElement }) {
  const cardHeader = element.querySelector<HTMLElement>("[data-card-header]")
  const cardSurface = element.querySelector<HTMLElement>("[data-card-surface]")
  if (!cardHeader || !cardSurface) {
    return
  }

  container.style.width = `${element.clientWidth}px`
  container.style.padding = "0.625rem"
  container.style.backgroundColor = getComputedStyle(cardSurface).backgroundColor
  container.className = "rounded-3xl"

  const preview = cardHeader.cloneNode(true) as HTMLElement
  preview.style.marginBottom = "0"
  container.append(preview)
  return () => preview.remove()
}

export function DraggableCard({ id, source, ...props }: DraggableCardProps) {
  const { isDragging, setNodeRef, setHandleRef } = useSortable({
    id,
    onGenerateDragPreview: generateDragPreview,
  })

  const dragHandle = (
    <div ref={setHandleRef} className="flex items-center justify-center">
      <Button
        variant="quiet"
        size="icon-fit"
        aria-label={`Move ${source.metadata.title}`}
        className="cursor-grab"
      >
        <PhDotsSixVerticalDuotone />
      </Button>
    </div>
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
