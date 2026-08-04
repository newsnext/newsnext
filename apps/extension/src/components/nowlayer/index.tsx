import type { RefObject } from "react"
import type { DesktopBoardCard } from "./desktop-board"
import type { BoardSortableSource } from "@/lib/board-sorting"
import { useAtomValue, useSetAtom } from "jotai"
import { useCallback, useMemo } from "react"
import { useSourceDescriptors } from "@/hooks/use-source-descriptors"
import { orderBoardSourceIds } from "@/lib/board-sorting"
import { ALL_BOARD_ID } from "@/lib/boards"
import {
  boardsAtom,
  instanceAtomsAtom,
  instanceLayoutsAtom,
  setManualBoardOrderAtom,
} from "@/store/board"
import { DesktopBoard } from "./desktop-board"

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
  const instanceAtoms = useAtomValue(instanceAtomsAtom)
  const instanceLayouts = useAtomValue(instanceLayoutsAtom)
  const setManualBoardOrder = useSetAtom(setManualBoardOrderAtom)
  const { sources } = useSourceDescriptors()
  const currentBoard = boards.find(board => board.id === boardId)!
  const currentBoardName = currentBoard.name

  const {
    sourceIds: boardSourceIds,
    sourceCardsMap,
    sortSourcesMap,
  } = useMemo(() => {
    const descriptorsMap = new Map(sources.map(source => [source.id, source]))
    const sourceIds: string[] = []
    const nextSourceCardsMap: Record<string, DesktopBoardCard> = {}
    const nextSortSourcesMap: Record<string, BoardSortableSource> = {}

    instanceLayouts.forEach((layout, index) => {
      if (boardId !== ALL_BOARD_ID && layout.boardId !== boardId) {
        return
      }

      const descriptor = descriptorsMap.get(layout.sourceId)
      const instanceAtom = instanceAtoms[index]
      if (!descriptor || !instanceAtom) {
        return
      }

      sourceIds.push(layout.instanceId)
      nextSourceCardsMap[layout.instanceId] = { descriptor, instanceAtom }
      nextSortSourcesMap[layout.instanceId] = {
        id: layout.instanceId,
        createdAt: layout.createdAt,
        provider: descriptor.provider,
        metadata: {
          title: layout.title ?? descriptor.metadata.title,
        },
      }
    })

    return {
      sourceIds,
      sourceCardsMap: nextSourceCardsMap,
      sortSourcesMap: nextSortSourcesMap,
    }
  }, [boardId, instanceAtoms, instanceLayouts, sources])

  const sourceIds = useMemo(() => orderBoardSourceIds({
    sourceIds: boardSourceIds,
    sourcesMap: sortSourcesMap,
    preference: currentBoard.sort,
  }), [boardSourceIds, currentBoard.sort, sortSourcesMap])

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
      sourceCardsMap={sourceCardsMap}
      className={className}
      isScattered={isScattered}
      containerRef={containerRef}
      onSourceIdsChange={handleSourceIdsChange}
    />
  )
}
