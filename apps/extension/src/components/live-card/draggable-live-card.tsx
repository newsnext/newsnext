import type { Atom } from "jotai"
import type { ReactNode } from "react"
import type { LiveCardProps } from "./index"
import type { LiveCard as LiveCardModel } from "@/lib/source"
import type { SourceDescriptor } from "@/typings/source"
import { cn } from "@newsnext/ui/lib/utils"
import { useAtomValue } from "jotai"
import { memo, useMemo } from "react"
import { canDragCardHeader, generateCardDragPreview } from "@/components/card-shell/drag-preview"
import { useSortable } from "@/hooks/use-sortable"
import { createLiveCard } from "@/lib/source"
import { LiveCard } from "./index"

interface DraggableLiveCardProps {
  boardId: string | null
  descriptor: SourceDescriptor
  dragging: boolean
  liveCardAtom: Atom<LiveCardModel>
  sortable?: boolean
}

interface SortableLiveCardProps extends Pick<LiveCardProps, "className" | "eager" | "source"> {
  dragging?: boolean
  sortable?: boolean
}

export function SortableLiveCard({
  className,
  dragging = false,
  eager,
  sortable = true,
  source,
}: SortableLiveCardProps): ReactNode {
  const id = source.id
  const { setNodeRef, setHandleRef } = useSortable({
    canDrag: canDragCardHeader,
    enabled: sortable,
    id,
    onGenerateDragPreview: generateCardDragPreview,
  })

  return (
    <LiveCard
      source={source}
      target={{ kind: "card", cardId: id }}
      eager={eager}
      nodeRef={setNodeRef}
      dragHandleRef={sortable ? setHandleRef : undefined}
      className={cn(className, dragging && "card-drag-placeholder")}
    />
  )
}

function DraggableLiveCardComponent({ boardId, descriptor, dragging, liveCardAtom, sortable = true }: DraggableLiveCardProps) {
  const card = useAtomValue(liveCardAtom)
  const source = useMemo(
    () => createLiveCard(descriptor, card, boardId),
    [boardId, descriptor, card],
  )
  return (
    <SortableLiveCard
      source={source}
      sortable={sortable}
      dragging={dragging}
    />
  )
}

export const DraggableLiveCard = memo(DraggableLiveCardComponent)
