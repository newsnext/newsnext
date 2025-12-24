import type { Source } from "@/typings/source"
import { useEffect, useState } from "react"
import { isMobile } from "react-device-detect"
import { trpc } from "@/lib/trpc"
import { DesktopBoard } from "./desktop-board"
import { MobileBoard } from "./mobile-board"

interface CardBoardProps {
  boardId?: "hottest" | "timeline" | "realtime"
  onSourceIdsChange?: (sourceIds: string[]) => void
  className?: string
  isScattered?: boolean
}

function processSources(sources: (Source & { id: string })[]) {
  // Construct unique IDs using namespace:id format
  const processedSources = sources.map((s) => {
    const uniqueId = s.namespace ? `${s.namespace}:${s.id}` : s.id
    return { ...s, uniqueId }
  })

  // Use Set to ensure IDs are unique
  const ids = [...new Set(processedSources.map(s => s.uniqueId))]
  const map: Record<string, Source & { id: string }> = {}

  processedSources.forEach((s) => {
    map[s.uniqueId] = { ...s, id: s.uniqueId } as unknown as Source & { id: string }
  })

  return { ids, map }
}

export function CardBoard({
  boardId = "hottest",
  onSourceIdsChange,
  className,
  isScattered,
}: CardBoardProps) {
  const [sourceIds, setSourceIds] = useState<string[]>([])
  const [sourcesMap, setSourcesMap] = useState<Record<string, Source & { id: string }>>({})

  const { data: sources } = trpc.getBoard.useQuery(
    { boardId },
  )

  useEffect(() => {
    console.log("sources", sources)
  }, [sources])

  const [prevBoardId, setPrevBoardId] = useState(boardId)
  if (prevBoardId !== boardId) {
    setPrevBoardId(boardId)
    setSourceIds([])
    setSourcesMap({})
  }

  useEffect(() => {
    if (sources) {
      const { ids, map } = processSources(sources)
      setSourceIds(ids)
      setSourcesMap(map)
    }
  }, [sources, boardId])

  const handleSourceIdsChange = (newSourceIds: string[]) => {
    setSourceIds(newSourceIds)
    onSourceIdsChange?.(newSourceIds)
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
      className={className}
      isScattered={isScattered}
      onSourceIdsChange={handleSourceIdsChange}
    />
  )
}
