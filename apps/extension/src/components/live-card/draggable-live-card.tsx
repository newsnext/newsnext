import type { Atom } from "jotai"
import type { ReactNode } from "react"
import type { LiveCardProps } from "./index"
import type { LiveCardHeight } from "@/lib/settings"
import type { Instance } from "@/lib/source"
import type { SourceDescriptor } from "@/typings/source"
import { useAtomValue } from "jotai"
import { memo, useMemo } from "react"
import { useSortable } from "@/hooks/use-sortable"
import { createLiveCard } from "@/lib/source"
import { cn } from "@/lib/utils"
import { liveCardHeightAtom } from "@/store/settings"
import { LiveCard } from "./index"

const LIVE_CARD_SIZE_CLASS_NAMES: Record<LiveCardHeight, string> = {
  compact: "h-120 w-100",
  balanced: "h-125 w-100",
  tall: "h-144 w-100",
}

const LIVE_CARD_DRAG_EXCLUDED_SELECTOR = "[data-live-card-drag-excluded]"

function canDragFromLiveCardHeader(target: Element | null): boolean {
  return !target?.closest(LIVE_CARD_DRAG_EXCLUDED_SELECTOR)
}

interface DraggableLiveCardProps {
  boardId: string | null
  descriptor: SourceDescriptor
  dragging: boolean
  instanceAtom: Atom<Instance>
  sortable?: boolean
}

interface SortableLiveCardProps extends Pick<LiveCardProps, "className" | "eager" | "sizeClassName" | "source"> {
  dragging?: boolean
  sortable?: boolean
}

export function SortableLiveCard({
  className,
  dragging = false,
  eager,
  sizeClassName,
  sortable = true,
  source,
}: SortableLiveCardProps): ReactNode {
  const id = source.id
  const { setNodeRef, setHandleRef } = useSortable({
    canDrag: canDragFromLiveCardHeader,
    enabled: sortable,
    id,
    onGenerateDragPreview: generateDragPreview,
  })

  return (
    <LiveCard
      source={source}
      target={{ kind: "instance", instanceId: id }}
      eager={eager}
      nodeRef={setNodeRef}
      dragHandleRef={sortable ? setHandleRef : undefined}
      sizeClassName={sizeClassName}
      className={cn(className, dragging && "opacity-50")}
    />
  )
}

function generateDragPreview({
  container,
  element,
}: { container: HTMLElement, element: HTMLElement }) {
  const header = element.querySelector<HTMLElement>("[data-live-card-header]")
  const surface = element.querySelector<HTMLElement>("[data-live-card-surface]")
  if (!header || !surface) return

  const backgroundColor = getComputedStyle(element).getPropertyValue("--color-background").trim()
    || getComputedStyle(document.body).backgroundColor
  const previewWidth = element.getBoundingClientRect().width
  container.style.width = `${previewWidth}px`

  const layer = document.createElement("div")
  layer.dataset.dragPreview = ""
  layer.className = "relative rounded-3xl shadow-md"
  layer.style.width = `${previewWidth}px`
  layer.style.padding = "0.625rem"
  const surfaceColor = getComputedStyle(surface).backgroundColor
  layer.style.background = `linear-gradient(${surfaceColor}, ${surfaceColor}), ${backgroundColor}`
  layer.style.setProperty("--color-theme-400", getComputedStyle(header).getPropertyValue("--color-theme-400"))

  const preview = header.cloneNode(true) as HTMLElement
  preview.style.marginBottom = "0"
  layer.append(preview)
  container.append(layer)

  return () => layer.remove()
}

function DraggableLiveCardComponent({ boardId, descriptor, dragging, instanceAtom, sortable = true }: DraggableLiveCardProps) {
  const instance = useAtomValue(instanceAtom)
  const liveCardHeight = useAtomValue(liveCardHeightAtom)
  const source = useMemo(
    () => createLiveCard(descriptor, instance, boardId),
    [boardId, descriptor, instance],
  )
  return (
    <SortableLiveCard
      source={source}
      sortable={sortable}
      sizeClassName={LIVE_CARD_SIZE_CLASS_NAMES[liveCardHeight]}
      dragging={dragging}
    />
  )
}

export const DraggableLiveCard = memo(DraggableLiveCardComponent)
