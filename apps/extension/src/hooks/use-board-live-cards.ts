import type { Atom } from "jotai"
import type { Board, SortableLiveCardView } from "@/lib/board"
import type { SourceInstance } from "@/lib/source"
import type { SourceDescriptor } from "@/typings/source"
import { useAtomValue } from "jotai"
import { useMemo } from "react"
import { orderLiveCardInstanceIds } from "@/lib/board"
import { boardsAtom, instanceAtomsAtom, instanceLayoutsAtom } from "@/store/board"
import { useSourceDescriptors } from "./use-source-descriptors"

export interface BoardLiveCard {
  collectionId: string | null
  descriptor: SourceDescriptor
  instanceAtom: Atom<SourceInstance>
}

interface BoardLiveCardsResult {
  currentBoard: Board
  liveCardsByInstanceId: Record<string, BoardLiveCard>
  instanceIds: string[]
}

export function useBoardLiveCards(boardId: string): BoardLiveCardsResult {
  const boards = useAtomValue(boardsAtom)
  const instanceAtoms = useAtomValue(instanceAtomsAtom)
  const instanceLayouts = useAtomValue(instanceLayoutsAtom)
  const { sources } = useSourceDescriptors()
  const currentBoard = boards.find(board => board.id === boardId)!

  const { instanceIds, liveCardsByInstanceId, sortableLiveCardsByInstanceId } = useMemo(() => {
    const descriptorsMap = new Map(sources.map(source => [source.id, source]))
    const nextInstanceIds: string[] = []
    const nextLiveCardsByInstanceId: Record<string, BoardLiveCard> = {}
    const nextSortableLiveCardsByInstanceId: Record<string, SortableLiveCardView> = {}

    instanceLayouts.forEach((layout, index) => {
      if (!layout.collectionIds.includes(boardId)) {
        return
      }

      const descriptor = descriptorsMap.get(layout.sourceId)
      const instanceAtom = instanceAtoms[index]
      if (!descriptor || !instanceAtom) {
        return
      }

      nextInstanceIds.push(layout.instanceId)
      nextLiveCardsByInstanceId[layout.instanceId] = {
        collectionId: boardId,
        descriptor,
        instanceAtom,
      }
      nextSortableLiveCardsByInstanceId[layout.instanceId] = {
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
      liveCardsByInstanceId: nextLiveCardsByInstanceId,
      sortableLiveCardsByInstanceId: nextSortableLiveCardsByInstanceId,
    }
  }, [boardId, instanceAtoms, instanceLayouts, sources])

  const orderedInstanceIds = useMemo(() => orderLiveCardInstanceIds({
    instanceIds,
    liveCardsByInstanceId: sortableLiveCardsByInstanceId,
    preference: currentBoard.sort,
  }), [currentBoard.sort, sortableLiveCardsByInstanceId, instanceIds])

  return {
    currentBoard,
    liveCardsByInstanceId,
    instanceIds: orderedInstanceIds,
  }
}
