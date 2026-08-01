import type { RefObject } from "react"
import type { BoardSource } from "@/typings/source"
import { useAtomValue, useSetAtom } from "jotai"
import { useCallback, useMemo } from "react"
import { useSourceDescriptors } from "@/hooks/use-source-descriptors"
import { getBoardSortPreference, orderBoardSourceIds } from "@/lib/board-sorting"
import { getBoardDisplayName } from "@/lib/boards"
import { buildSourceCards } from "@/lib/source-cards"
import {
  boardsAtom,
  boardSortPreferencesAtom,
  instancesAtom,
  setManualBoardOrderAtom,
} from "@/store/board"
import { DesktopBoard } from "./desktop-board"

const EMPTY_SOURCE_IDS: string[] = []
const EMPTY_SOURCES_MAP: Record<string, BoardSource> = {}
interface NowLayerProps {
  boardId: string
  className?: string
  isScattered?: boolean
  containerRef?: RefObject<HTMLDivElement | null>
}

export function NowLayer({
  boardId,
  className,
  isScattered,
  containerRef,
}: NowLayerProps) {
  const boards = useAtomValue(boardsAtom)
  const sortPreferences = useAtomValue(boardSortPreferencesAtom)
  const instances = useAtomValue(instancesAtom)
  const setManualBoardOrder = useSetAtom(setManualBoardOrderAtom)
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

  const sourceIds = useMemo(() => orderBoardSourceIds({
    sourceIds: boardSourceIds,
    sourcesMap,
    preference: getBoardSortPreference(sortPreferences, boardId),
  }), [boardId, boardSourceIds, sortPreferences, sourcesMap])

  const handleSourceIdsChange = useCallback((newSourceIds: string[]) => {
    setManualBoardOrder({ boardId, sourceIds: newSourceIds })
  }, [boardId, setManualBoardOrder])

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
      className={className}
      isScattered={isScattered}
      containerRef={containerRef}
      onSourceIdsChange={handleSourceIdsChange}
    />
  )
}
