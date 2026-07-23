import type { RefObject } from "react"
import type { BoardSource } from "@/typings/source"
import { useAtom, useAtomValue } from "jotai"
import { useCallback, useMemo, useState } from "react"
import { buildBoardSources } from "@/lib/source-cards"
import { getSourceDescriptors } from "@/lib/sources"
import { boardInstancesAtom, boardStarIdsAtom, pendingForkFocusAtom } from "@/store/board"
import { DesktopBoard } from "./desktop-board"

const EMPTY_SOURCE_IDS: string[] = []
const EMPTY_SOURCES_MAP: Record<string, BoardSource> = {}
const SOURCES = getSourceDescriptors()

type NowLayerBoardId = "featured" | "forks" | "stars"

interface SourceIdOrderState {
  boardId: NowLayerBoardId
  ids: string[]
}

interface NowLayerProps {
  boardId?: NowLayerBoardId
  onSourceIdsChange?: (sourceIds: string[]) => void
  className?: string
  isScattered?: boolean
  containerRef?: RefObject<HTMLDivElement | null>
}

export function NowLayer({
  boardId = "featured",
  onSourceIdsChange,
  className,
  isScattered,
  containerRef,
}: NowLayerProps) {
  const [sourceIdOrderState, setSourceIdOrderState] = useState<SourceIdOrderState | null>(null)
  const [pendingForkFocusId, setPendingForkFocusId] = useAtom(pendingForkFocusAtom)
  const sourceIdOrder = sourceIdOrderState?.boardId === boardId ? sourceIdOrderState.ids : null
  const starredInstanceIds = useAtomValue(boardStarIdsAtom(boardId))
  const instances = useAtomValue(boardInstancesAtom(boardId))
  const sources = SOURCES

  const { ids: boardSourceIds, map: sourcesMap } = useMemo(() => {
    if (!sources.length) {
      return { ids: EMPTY_SOURCE_IDS, map: EMPTY_SOURCES_MAP }
    }

    return buildBoardSources({
      sources,
      boardId,
      starredSourceInstanceIds: starredInstanceIds,
      sourceInstances: instances,
      isLocalOnly: true,
    })
  }, [sources, boardId, starredInstanceIds, instances])

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
    setSourceIdOrderState({ boardId, ids: newSourceIds })
    onSourceIdsChange?.(newSourceIds)
  }, [boardId, onSourceIdsChange])

  const handleFocusedSourceComplete = useCallback(() => {
    setPendingForkFocusId(null)
  }, [setPendingForkFocusId])

  const focusedSourceId = boardId === "forks" && pendingForkFocusId && sourceIds.includes(pendingForkFocusId)
    ? pendingForkFocusId
    : null

  if (boardId === "stars" && sourceIds.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-6 text-center text-sm text-muted-foreground">
        Star cards from any board to collect them here.
      </div>
    )
  }

  if (boardId === "forks" && sourceIds.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-6 text-center text-sm text-muted-foreground">
        Fork a card to collect your source forks here.
      </div>
    )
  }

  return (
    <DesktopBoard
      key={boardId}
      sourceIds={sourceIds}
      sourcesMap={sourcesMap}
      isSortable={boardId === "forks" || boardId === "stars"}
      className={className}
      isScattered={isScattered}
      containerRef={containerRef}
      onSourceIdsChange={handleSourceIdsChange}
      focusedSourceId={focusedSourceId}
      onFocusedSourceComplete={handleFocusedSourceComplete}
    />
  )
}
