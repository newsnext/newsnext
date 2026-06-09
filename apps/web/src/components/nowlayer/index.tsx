import type { RefObject } from "react"
import type { BoardSource } from "@/typings/source"
import { useQuery } from "@tanstack/react-query"
import { useAtomValue } from "jotai"
import { useEffect, useState } from "react"
import { isMobile } from "react-device-detect"
import { orpc } from "@/lib/orpc"
import { buildBoardSources } from "@/lib/source-cards"
import { sourceInstancesAtom, starredSourceInstanceIdsAtom } from "@/store/board"
import { DesktopBoard } from "./desktop-board"
import { MobileBoard } from "./mobile-board"

interface NowLayerProps {
  boardId?: "featured" | "forks" | "stars"
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
  const [sourceIds, setSourceIds] = useState<string[]>([])
  const [sourcesMap, setSourcesMap] = useState<Record<string, BoardSource>>({})
  const starredSourceInstanceIds = useAtomValue(starredSourceInstanceIdsAtom)
  const sourceInstances = useAtomValue(sourceInstancesAtom)

  const { data: sources, isPending } = useQuery(orpc.getBoard.queryOptions())

  const [prevBoardId, setPrevBoardId] = useState(boardId)
  if (prevBoardId !== boardId) {
    setPrevBoardId(boardId)
    setSourceIds([])
    setSourcesMap({})
  }

  useEffect(() => {
    if (sources) {
      const { ids, map } = buildBoardSources({
        sources,
        boardId,
        starredSourceInstanceIds,
        sourceInstances,
      })
      setSourceIds(ids)
      setSourcesMap(map)
    }
  }, [sources, boardId, starredSourceInstanceIds, sourceInstances])

  const handleSourceIdsChange = (newSourceIds: string[]) => {
    setSourceIds(newSourceIds)
    onSourceIdsChange?.(newSourceIds)
  }

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
      <MobileBoard
        key={boardId}
        sourceIds={sourceIds}
        sourcesMap={sourcesMap}
        className={className}
        isScattered={isScattered}
      />
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
    />
  )
}
