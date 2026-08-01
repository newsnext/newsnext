import type { RefObject } from "react"
import type { BoardSource } from "@/typings/source"
import { useAtomValue } from "jotai"
import { useCallback, useMemo, useState } from "react"
import { useSourceDescriptors } from "@/hooks/use-source-descriptors"
import { getBoardDisplayName } from "@/lib/boards"
import { buildSourceCards } from "@/lib/source-cards"
import { boardsAtom, instancesAtom } from "@/store/board"
import { DesktopBoard } from "./desktop-board"

const EMPTY_SOURCE_IDS: string[] = []
const EMPTY_SOURCES_MAP: Record<string, BoardSource> = {}
interface NowLayerProps {
  boardId: string
  onSourceIdsChange?: (sourceIds: string[]) => void
  className?: string
  isScattered?: boolean
  containerRef?: RefObject<HTMLDivElement | null>
}

export function NowLayer({
  boardId,
  onSourceIdsChange,
  className,
  isScattered,
  containerRef,
}: NowLayerProps) {
  const [sourceIdOrder, setSourceIdOrder] = useState<string[] | null>(null)
  const boards = useAtomValue(boardsAtom)
  const instances = useAtomValue(instancesAtom)
  const { sources } = useSourceDescriptors()
  const currentBoardName = getBoardDisplayName(boards.find(board => board.id === boardId)!)

  const { ids: boardSourceIds, map: sourcesMap } = useMemo(() => {
    if (!sources.length) {
      return { ids: EMPTY_SOURCE_IDS, map: EMPTY_SOURCES_MAP }
    }

    return buildSourceCards({
      sources,
      sourceInstances: instances,
      boardId,
    })
  }, [boardId, sources, instances])

  const sourceIds = useMemo(() => {
    if (!sourceIdOrder) {
      return boardSourceIds
    }

    const boardSourceIdSet = new Set(boardSourceIds)
    const orderedIds = sourceIdOrder.filter(id => boardSourceIdSet.has(id))
    const orderedIdSet = new Set(orderedIds)
    const appendedIds = boardSourceIds.filter(id => !orderedIdSet.has(id))

    return [...orderedIds, ...appendedIds]
  }, [boardSourceIds, sourceIdOrder])

  const handleSourceIdsChange = useCallback((newSourceIds: string[]) => {
    setSourceIdOrder(newSourceIds)
    onSourceIdsChange?.(newSourceIds)
  }, [onSourceIdsChange])

  if (sourceIds.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-6 text-center text-sm text-muted-foreground">
        Use Radar on a page to add a card to
        {" "}
        {currentBoardName}
        .
      </div>
    )
  }

  return (
    <DesktopBoard
      key={boardId}
      sourceIds={sourceIds}
      sourcesMap={sourcesMap}
      isSortable
      className={className}
      isScattered={isScattered}
      containerRef={containerRef}
      onSourceIdsChange={handleSourceIdsChange}
    />
  )
}
