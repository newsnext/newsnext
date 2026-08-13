import type { Atom } from "jotai"
import type { Board, SortableCardView } from "@/lib/board"
import type { SourceInstance } from "@/lib/source"
import type { SourceDescriptor } from "@/typings/source"
import { useAtomValue } from "jotai"
import { useMemo } from "react"
import { ALL_BOARD_ID, orderCardInstanceIds } from "@/lib/board"
import { boardsAtom, instanceAtomsAtom, instanceLayoutsAtom } from "@/store/board"
import { useSourceDescriptors } from "./use-source-descriptors"

export interface BoardSourceCard {
  collectionId: string | null
  descriptor: SourceDescriptor
  instanceAtom: Atom<SourceInstance>
}

interface BoardSourceCardsResult {
  currentBoard: Board
  cardsByInstanceId: Record<string, BoardSourceCard>
  instanceIds: string[]
}

export function useBoardSourceCards(boardId: string): BoardSourceCardsResult {
  const boards = useAtomValue(boardsAtom)
  const instanceAtoms = useAtomValue(instanceAtomsAtom)
  const instanceLayouts = useAtomValue(instanceLayoutsAtom)
  const { sources } = useSourceDescriptors()
  const currentBoard = boards.find(board => board.id === boardId)!

  const { instanceIds, cardsByInstanceId, sortSourcesMap } = useMemo(() => {
    const descriptorsMap = new Map(sources.map(source => [source.id, source]))
    const nextInstanceIds: string[] = []
    const nextCardsByInstanceId: Record<string, BoardSourceCard> = {}
    const nextSortSourcesMap: Record<string, SortableCardView> = {}

    instanceLayouts.forEach((layout, index) => {
      if (boardId !== ALL_BOARD_ID && !layout.collectionIds.includes(boardId)) {
        return
      }

      const descriptor = descriptorsMap.get(layout.sourceId)
      const instanceAtom = instanceAtoms[index]
      if (!descriptor || !instanceAtom) {
        return
      }

      nextInstanceIds.push(layout.instanceId)
      nextCardsByInstanceId[layout.instanceId] = {
        collectionId: boardId === ALL_BOARD_ID ? null : boardId,
        descriptor,
        instanceAtom,
      }
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
      instanceIds: nextInstanceIds,
      cardsByInstanceId: nextCardsByInstanceId,
      sortSourcesMap: nextSortSourcesMap,
    }
  }, [boardId, instanceAtoms, instanceLayouts, sources])

  const orderedInstanceIds = useMemo(() => orderCardInstanceIds({
    instanceIds,
    cardsByInstanceId: sortSourcesMap,
    preference: currentBoard.sort,
  }), [currentBoard.sort, sortSourcesMap, instanceIds])

  return {
    currentBoard,
    cardsByInstanceId,
    instanceIds: orderedInstanceIds,
  }
}
