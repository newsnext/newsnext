import type { Atom } from "jotai"
import type { ReactNode } from "react"
import type { LiveCardProps } from "./index"
import type { Instance } from "@/lib/source"
import type { SourceDescriptor } from "@/typings/source"
import { cn } from "@newsnext/ui/lib/utils"
import { useAtomValue } from "jotai"
import { memo, useMemo } from "react"
import { useSortable } from "@/hooks/use-sortable"
import { createLiveCard } from "@/lib/source"
import { canDragCardHeader, generateLiveCardDragPreview } from "./drag-preview"
import { LiveCard } from "./index"

interface DraggableLiveCardProps {
  boardId: string | null
  descriptor: SourceDescriptor
  dragging: boolean
  instanceAtom: Atom<Instance>
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
    onGenerateDragPreview: generateLiveCardDragPreview,
  })

  return (
    <LiveCard
      source={source}
      target={{ kind: "instance", instanceId: id }}
      eager={eager}
      nodeRef={setNodeRef}
      dragHandleRef={sortable ? setHandleRef : undefined}
      className={cn(className, dragging && "card-drag-placeholder")}
    />
  )
}

function DraggableLiveCardComponent({ boardId, descriptor, dragging, instanceAtom, sortable = true }: DraggableLiveCardProps) {
  const instance = useAtomValue(instanceAtom)
  const source = useMemo(
    () => createLiveCard(descriptor, instance, boardId),
    [boardId, descriptor, instance],
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
