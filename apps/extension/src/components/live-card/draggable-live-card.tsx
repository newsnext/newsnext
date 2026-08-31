import type { Atom } from "jotai"
import type { LiveCardHeight } from "@/lib/settings"
import type { Instance } from "@/lib/source"
import type { SourceDescriptor } from "@/typings/source"
import { useAtomValue } from "jotai"
import { memo, useMemo } from "react"
import { useSortable } from "@/hooks/use-sortable"
import { createLiveCard } from "@/lib/source"
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

function generateDragPreview({
  container,
  draggedIds,
  elements,
}: { container: HTMLElement, draggedIds: string[], elements: HTMLElement[] }) {
  const previewSources = elements.flatMap((item, index) => {
    const header = item.querySelector<HTMLElement>("[data-live-card-header]")
    const surface = item.querySelector<HTMLElement>("[data-live-card-surface]")
    const backgroundColor = getComputedStyle(item).getPropertyValue("--color-background").trim()
      || getComputedStyle(document.body).backgroundColor
    return header && surface
      ? [{
          backgroundColor,
          header,
          id: item.dataset.liveCardId ?? draggedIds[index],
          surfaceColor: getComputedStyle(surface).backgroundColor,
          themeColor: getComputedStyle(header).getPropertyValue("--color-theme-400"),
        }]
      : []
  })
  if (previewSources.length === 0) return

  const previewWidth = elements[0]?.getBoundingClientRect().width ?? 400
  container.style.width = `${previewWidth}px`
  container.className = "flex flex-col gap-1.5"

  const layers = previewSources.map(({ backgroundColor, header, id, surfaceColor, themeColor }) => {
    const layer = document.createElement("div")
    if (id) layer.dataset.dragPreviewId = id
    layer.className = "relative rounded-3xl shadow-md"
    layer.style.width = `${previewWidth}px`
    layer.style.padding = "0.625rem"
    layer.style.background = `linear-gradient(${surfaceColor}, ${surfaceColor}), ${backgroundColor}`
    layer.style.setProperty("--color-theme-400", themeColor)

    const preview = header.cloneNode(true) as HTMLElement
    preview.style.marginBottom = "0"
    layer.append(preview)
    return layer
  })
  layers.forEach(layer => container.append(layer))

  if (draggedIds.length > 1) {
    const count = document.createElement("span")
    count.textContent = `${draggedIds.length}`
    count.className = "absolute -right-2 -top-2 z-10 flex size-7 items-center justify-center rounded-full bg-theme-400 text-xs font-semibold text-background shadow-md"
    layers[0]?.append(count)
  }

  return () => layers.forEach(layer => layer.remove())
}

function DraggableLiveCardComponent({ boardId, descriptor, dragging, instanceAtom, sortable = true }: DraggableLiveCardProps) {
  const instance = useAtomValue(instanceAtom)
  const liveCardHeight = useAtomValue(liveCardHeightAtom)
  const source = useMemo(
    () => createLiveCard(descriptor, instance, boardId),
    [boardId, descriptor, instance],
  )
  const id = instance.instanceId
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
      nodeRef={setNodeRef}
      dragHandleRef={sortable ? setHandleRef : undefined}
      sizeClassName={LIVE_CARD_SIZE_CLASS_NAMES[liveCardHeight]}
      className={dragging ? "opacity-50" : undefined}
    />
  )
}

export const DraggableLiveCard = memo(DraggableLiveCardComponent)
