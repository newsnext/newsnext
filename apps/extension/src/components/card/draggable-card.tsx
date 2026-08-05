import type { Atom } from "jotai"
import type { BoardFilter } from "@/lib/board-filter"
import type { SourceInstance } from "@/lib/source-cards"
import type { SourceDescriptor } from "@/typings/source"
import { useAtomValue } from "jotai"
import { memo, useMemo } from "react"
import { useSortable } from "@/hooks/use-sortable"
import { createBoardSource } from "@/lib/source-cards"
import { PhDotsSixVerticalDuotone } from "../icons/ph"
import { CardHeaderActionButton } from "./card-header"
import { SourceCard } from "./index"

interface DraggableCardProps {
  descriptor: SourceDescriptor
  filter?: BoardFilter
  forceMount?: boolean
  instanceAtom: Atom<SourceInstance>
}

function generateDragPreview({ container, element }: { container: HTMLElement, element: HTMLElement }) {
  const cardHeader = element.querySelector<HTMLElement>("[data-card-header]")
  const cardSurface = element.querySelector<HTMLElement>("[data-card-surface]")
  if (!cardHeader || !cardSurface) {
    return
  }

  container.style.width = `${element.clientWidth}px`
  container.style.padding = "0.625rem"
  container.style.backgroundColor = getComputedStyle(cardSurface).backgroundColor
  container.style.setProperty(
    "--color-theme-400",
    getComputedStyle(cardHeader).getPropertyValue("--color-theme-400"),
  )
  container.className = "rounded-3xl"

  const preview = cardHeader.cloneNode(true) as HTMLElement
  preview.style.marginBottom = "0"
  container.append(preview)
  return () => preview.remove()
}

function DraggableCardComponent({ descriptor, filter, forceMount, instanceAtom }: DraggableCardProps) {
  const instance = useAtomValue(instanceAtom)
  const source = useMemo(
    () => createBoardSource(descriptor, instance),
    [descriptor, instance],
  )
  const id = instance.instanceId
  const { isDragging, setNodeRef, setHandleRef } = useSortable({
    id,
    onGenerateDragPreview: generateDragPreview,
  })

  const dragHandle = (
    <div ref={setHandleRef} className="flex items-center justify-center">
      <CardHeaderActionButton
        aria-label={`Move ${source.metadata.title}`}
        className="cursor-grab"
      >
        <PhDotsSixVerticalDuotone />
      </CardHeaderActionButton>
    </div>
  )

  return (
    <SourceCard
      id={id}
      source={source}
      filter={filter}
      forceMount={forceMount}
      nodeRef={setNodeRef}
      dragHandle={dragHandle}
      className={isDragging ? "opacity-50" : undefined}
    />
  )
}

export const DraggableCard = memo(DraggableCardComponent)
