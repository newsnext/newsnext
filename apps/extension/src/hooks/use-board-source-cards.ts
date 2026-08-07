import type { Atom } from "jotai"
import type { Board, BoardSortableSource } from "@/lib/board"
import type { SourceInstance } from "@/lib/source"
import type { SourceDescriptor } from "@/typings/source"
import { useAtomValue } from "jotai"
import { useMemo } from "react"
import { ALL_BOARD_ID, orderBoardSourceIds } from "@/lib/board"
import { boardsAtom, instanceAtomsAtom, instanceLayoutsAtom } from "@/store/board"
import { useSourceDescriptors } from "./use-source-descriptors"

export interface BoardSourceCard {
  descriptor: SourceDescriptor
  instanceAtom: Atom<SourceInstance>
}

interface BoardSourceCardsResult {
  currentBoard: Board
  sourceCardsMap: Record<string, BoardSourceCard>
  sourceIds: string[]
}

export function useBoardSourceCards(boardId: string): BoardSourceCardsResult {
  const boards = useAtomValue(boardsAtom)
  const instanceAtoms = useAtomValue(instanceAtomsAtom)
  const instanceLayouts = useAtomValue(instanceLayoutsAtom)
  const { sources } = useSourceDescriptors()
  const currentBoard = boards.find(board => board.id === boardId)!

  const { sourceIds, sourceCardsMap, sortSourcesMap } = useMemo(() => {
    const descriptorsMap = new Map(sources.map(source => [source.id, source]))
    const nextSourceIds: string[] = []
    const nextSourceCardsMap: Record<string, BoardSourceCard> = {}
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

      nextSourceIds.push(layout.instanceId)
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
      sourceIds: nextSourceIds,
      sourceCardsMap: nextSourceCardsMap,
      sortSourcesMap: nextSortSourcesMap,
    }
  }, [boardId, instanceAtoms, instanceLayouts, sources])

  const orderedSourceIds = useMemo(() => orderBoardSourceIds({
    sourceIds,
    sourcesMap: sortSourcesMap,
    preference: currentBoard.sort,
  }), [currentBoard.sort, sortSourcesMap, sourceIds])

  return {
    currentBoard,
    sourceCardsMap,
    sourceIds: orderedSourceIds,
  }
}
