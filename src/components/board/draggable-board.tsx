import type { BaseEventPayload, ElementDragType } from "@atlaskit/pragmatic-drag-and-drop/dist/types/internal-types"
import type { BoardProps } from "./index"
import { useCallback, useState } from "react"
import { DndContext } from "@/hooks/use-dnd-context"
import useThrottleFn from "@/hooks/use-throttle-fn"
import { DraggableCard } from "../card/draggable-card"
import { MOCK_SOURCES } from "../card/mock-data"
import Board, { ANIMATION_DURATION } from "./index"

interface DraggableBoardProps extends Omit<BoardProps, "sourceIds" | "renderCard"> {
  initialSourceIds?: string[]
  onSourceIdsChange?: (sourceIds: string[]) => void
}

export function DraggableBoard({
  initialSourceIds = Object.keys(MOCK_SOURCES),
  onSourceIdsChange,
  ...props
}: DraggableBoardProps) {
  const [sourceIds, setSourceIds] = useState<string[]>(initialSourceIds)

  const onDropTargetChange = useCallback(({ location, source }: BaseEventPayload<ElementDragType>) => {
    const target = location.current.dropTargets[0]
    if (!target?.data || !source?.data) return

    const fromId = source.data.id as string
    const toId = target.data.id as string

    const fromIndex = sourceIds.indexOf(fromId)
    const toIndex = sourceIds.indexOf(toId)

    if (fromIndex === toIndex || fromIndex === -1 || toIndex === -1) return

    const newSourceIds = [...sourceIds]
    const [movedItem] = newSourceIds.splice(fromIndex, 1)
    newSourceIds.splice(toIndex, 0, movedItem)

    setSourceIds(newSourceIds)
    onSourceIdsChange?.(newSourceIds)
  }, [sourceIds, onSourceIdsChange])

  // avoid animation jitter
  const { run } = useThrottleFn(onDropTargetChange, {
    leading: true,
    trailing: true,
    wait: ANIMATION_DURATION * 1000,
  })

  return (
    <DndContext onDropTargetChange={run}>
      <Board
        sourceIds={sourceIds}
        renderCard={id => <DraggableCard id={id} />}
        {...props}
      />
    </DndContext>
  )
}
