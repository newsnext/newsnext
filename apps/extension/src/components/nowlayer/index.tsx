import type { RefObject } from "react"
import type { BoardSource } from "@/typings/source"
import { useQuery } from "@tanstack/react-query"
import { useAtomValue } from "jotai"
import { lazy, Suspense, useCallback, useMemo, useState } from "react"
import { isMobile } from "react-device-detect"
import { getLocalSourceDescriptors } from "@/lib/local-sources"
import { orpc } from "@/lib/orpc"
import { buildBoardSources } from "@/lib/source-cards"
import { getDefaultSourceMode } from "@/lib/source-mode"
import { boardInstancesAtom, boardStarIdsAtom } from "@/store/board"

const EMPTY_SOURCE_IDS: string[] = []
const EMPTY_SOURCES_MAP: Record<string, BoardSource> = {}
const LOCAL_SOURCES = getLocalSourceDescriptors()

const DesktopBoard = lazy(() => import("./desktop-board").then(module => ({ default: module.DesktopBoard })))
const MobileBoard = lazy(() => import("./mobile-board").then(module => ({ default: module.MobileBoard })))

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
  const sourceIdOrder = sourceIdOrderState?.boardId === boardId ? sourceIdOrderState.ids : null
  const starredInstanceIds = useAtomValue(boardStarIdsAtom(boardId))
  const instances = useAtomValue(boardInstancesAtom(boardId))
  const sourceMode = getDefaultSourceMode()
  const { data: remoteSources, isPending } = useQuery(orpc.getBoard.queryOptions({
    enabled: sourceMode === "remote",
  }))
  const sources = sourceMode === "local" ? LOCAL_SOURCES : remoteSources

  const { ids: boardSourceIds, map: sourcesMap } = useMemo(() => {
    if (!sources?.length) {
      return { ids: EMPTY_SOURCE_IDS, map: EMPTY_SOURCES_MAP }
    }

    return buildBoardSources({
      sources,
      boardId,
      starredSourceInstanceIds: starredInstanceIds,
      sourceInstances: instances,
      isLocalOnly: sourceMode === "local",
    })
  }, [sources, boardId, starredInstanceIds, instances, sourceMode])

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

  if (!isPending && boardId === "stars" && sourceIds.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-6 text-center text-sm text-muted-foreground">
        Star cards from any board to collect them here.
      </div>
    )
  }

  if (!isPending && boardId === "forks" && sourceIds.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-6 text-center text-sm text-muted-foreground">
        Fork a card to collect your source forks here.
      </div>
    )
  }

  if (isMobile) {
    return (
      <Suspense fallback={null}>
        <MobileBoard
          key={boardId}
          sourceIds={sourceIds}
          sourcesMap={sourcesMap}
          className={className}
          isScattered={isScattered}
        />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={null}>
      <DesktopBoard
        key={boardId}
        sourceIds={sourceIds}
        sourcesMap={sourcesMap}
        isSortable={boardId === "forks" || boardId === "stars"}
        className={className}
        isScattered={isScattered}
        containerRef={containerRef}
        onSourceIdsChange={handleSourceIdsChange}
      />
    </Suspense>
  )
}
