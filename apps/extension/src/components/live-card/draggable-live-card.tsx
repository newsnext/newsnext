import type { Atom } from "jotai"
import type { LiveCardHeight } from "@/lib/settings"
import type { SourceInstance } from "@/lib/source"
import type { SourceDescriptor } from "@/typings/source"
import { useAtomValue } from "jotai"
import { memo, useMemo } from "react"
import { useSortable } from "@/hooks/use-sortable"
import { createLiveCard } from "@/lib/source"
import { liveCardHeightAtom } from "@/store/settings"
import { PhDotsSixVerticalDuotone } from "../icons/ph"
import { LiveCardHeaderActionButton } from "./card-header"
import { LiveCard } from "./index"

const LIVE_CARD_SIZE_CLASS_NAMES: Record<LiveCardHeight, string> = {
  compact: "h-120 w-100",
  balanced: "h-125 w-100",
  tall: "h-144 w-100",
}

interface DraggableLiveCardProps {
  collectionId: string | null
  descriptor: SourceDescriptor
  instanceAtom: Atom<SourceInstance>
  sortable?: boolean
}

function generateDragPreview({ container, element }: { container: HTMLElement, element: HTMLElement }) {
  const cardHeader = element.querySelector<HTMLElement>("[data-live-card-header]")
  const cardSurface = element.querySelector<HTMLElement>("[data-live-card-surface]")
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

function DraggableLiveCardComponent({ collectionId, descriptor, instanceAtom, sortable = true }: DraggableLiveCardProps) {
  const instance = useAtomValue(instanceAtom)
  const liveCardHeight = useAtomValue(liveCardHeightAtom)
  const source = useMemo(
    () => createLiveCard(descriptor, instance, collectionId),
    [collectionId, descriptor, instance],
  )
  const id = instance.instanceId
  const { isDragging, setNodeRef, setHandleRef } = useSortable({
    enabled: sortable,
    id,
    onGenerateDragPreview: generateDragPreview,
  })

  const dragHandle = sortable
    ? (
        <div ref={setHandleRef} className="flex items-center justify-center">
          <LiveCardHeaderActionButton
            aria-label={`Move ${source.metadata.title}`}
            className="cursor-grab"
          >
            <PhDotsSixVerticalDuotone />
          </LiveCardHeaderActionButton>
        </div>
      )
    : undefined

  return (
    <LiveCard
      id={id}
      source={source}
      nodeRef={setNodeRef}
      dragHandle={dragHandle}
      sizeClassName={LIVE_CARD_SIZE_CLASS_NAMES[liveCardHeight]}
      className={isDragging ? "opacity-50" : undefined}
    />
  )
}

export const DraggableLiveCard = memo(DraggableLiveCardComponent)
