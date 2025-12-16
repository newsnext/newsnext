import type { Source } from "@/typings/source"
import { useEffect, useState } from "react"
import { isMobile } from "react-device-detect"
import { trpc } from "@/lib/trpc"
import { DesktopBoard } from "./desktop-board"
import { MobileBoard } from "./mobile-board"

interface CardBoardProps {
  initialSourceIds?: string[]
  boardId?: "hottest" | "timeline" | "realtime"
  onSourceIdsChange?: (sourceIds: string[]) => void
  className?: string
  isScattered?: boolean
}

export function CardBoard({
  initialSourceIds,
  boardId = "hottest",
  onSourceIdsChange,
  className,
  isScattered,
}: CardBoardProps) {
  const [sourceIds, setSourceIds] = useState<string[]>(initialSourceIds || [])
  const [sourcesMap, setSourcesMap] = useState<Record<string, Source & { id: string }>>({})

  const { data: sources } = trpc.getBoard.useQuery({ boardId }, {
    enabled: !initialSourceIds,
  })

  // Pre-fetch all sources in batch for better performance
  // useBatchQuery(sourceIds)

  useEffect(() => {
    if (sources && !initialSourceIds) {
      // Construct unique IDs using namespace:id format
      const processedSources = sources.map((s) => {
        const uniqueId = s.namespace ? `${s.namespace}:${s.id}` : s.id
        return { ...s, uniqueId }
      })

      // Use Set to ensure IDs are unique
      const ids = [...new Set(processedSources.map(s => s.uniqueId))]
      const map: Record<string, Source & { id: string }> = {}

      processedSources.forEach((s) => {
        // Store the original metadata but accessible via the unique ID
        // We override the 'id' field in the map value to match the key if needed,
        // but keeping original id might be better for display?
        // Actually, DraggableCard uses 'id' prop for key, but 'source' prop for data.
        // Let's ensure the source object passed down has the correct properties.
        map[s.uniqueId] = { ...s, id: s.uniqueId } as unknown as Source & { id: string }
      })

      setSourceIds(ids)
      setSourcesMap(map)
    }
  }, [sources, initialSourceIds])

  const handleSourceIdsChange = (newSourceIds: string[]) => {
    setSourceIds(newSourceIds)
    onSourceIdsChange?.(newSourceIds)
  }

  if (isMobile) {
    return <MobileBoard sourceIds={sourceIds} sourcesMap={sourcesMap} className={className} isScattered={isScattered} />
  }

  return (
    <DesktopBoard
      sourceIds={sourceIds}
      sourcesMap={sourcesMap}
      className={className}
      isScattered={isScattered}
      onSourceIdsChange={handleSourceIdsChange}
    />
  )
}
