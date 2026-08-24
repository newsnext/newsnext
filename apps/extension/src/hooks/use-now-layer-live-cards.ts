import type { Atom } from "jotai"
import type { Board, SortableNowLayerLiveCard } from "@/lib/board"
import type { Instance } from "@/lib/source"
import type { SourceDescriptor } from "@/typings/source"
import { useAtomValue } from "jotai"
import { useMemo } from "react"
import { orderNowLayerInstanceIds } from "@/lib/board"
import { boardsAtom, instanceAtomsAtom, instancesAtom } from "@/store/board"
import { useCachedInstanceResultFinder } from "./use-cached-source-result"

export interface NowLayerLiveCard {
  boardId: string
  descriptor: SourceDescriptor
  instanceAtom: Atom<Instance>
}

interface NowLayerLiveCardsResult {
  currentBoard: Board
  liveCardsByInstanceId: Record<string, NowLayerLiveCard>
  instanceIds: string[]
}

function createSourcePlaceholder(sourceId: string): SourceDescriptor {
  const providerId = sourceId.split(":", 1)[0] || sourceId
  return {
    id: sourceId,
    version: 0,
    capabilities: { cookies: [], network: [] },
    metadata: { title: sourceId },
    provider: {
      color: "slate",
      title: providerId,
    },
  }
}

export function useNowLayerLiveCards(boardId: string): NowLayerLiveCardsResult {
  const boards = useAtomValue(boardsAtom)
  const instances = useAtomValue(instancesAtom)
  const instanceAtoms = useAtomValue(instanceAtomsAtom)
  const findCachedResult = useCachedInstanceResultFinder()
  const currentBoard = boards.find(board => board.id === boardId)!

  const { liveCardsByInstanceId, sortableLiveCardsByInstanceId } = useMemo(() => {
    const instancesById = new Map<string, {
      instance: Instance
      instanceAtom: Atom<Instance>
    }>(instances.flatMap((instance, index) => {
      const instanceAtom = instanceAtoms[index]
      return instanceAtom
        ? [[instance.instanceId, { instance, instanceAtom }] as const]
        : []
    }))
    const nextLiveCards: Record<string, NowLayerLiveCard> = {}
    const nextSortableLiveCards: Record<string, SortableNowLayerLiveCard> = {}

    for (const instanceId of currentBoard.instanceIds) {
      const entry = instancesById.get(instanceId)
      if (!entry) continue
      const { instance, instanceAtom } = entry

      const cachedDescriptor = findCachedResult(
        instance.instanceId,
        instance.sourceId,
      )?.source
      const descriptor = cachedDescriptor
        ?? createSourcePlaceholder(instance.sourceId)

      nextLiveCards[instanceId] = {
        boardId,
        descriptor,
        instanceAtom,
      }
      nextSortableLiveCards[instanceId] = {
        id: instanceId,
        provider: descriptor.provider,
        metadata: {
          title: instance.patch.metadata?.title ?? descriptor.metadata.title,
        },
      }
    }

    return {
      liveCardsByInstanceId: nextLiveCards,
      sortableLiveCardsByInstanceId: nextSortableLiveCards,
    }
  }, [boardId, currentBoard.instanceIds, findCachedResult, instanceAtoms, instances])

  const instanceIds = useMemo(() => orderNowLayerInstanceIds({
    instanceIds: currentBoard.instanceIds,
    liveCardsByInstanceId: sortableLiveCardsByInstanceId,
    sort: currentBoard.nowLayer.sort,
  }), [currentBoard.instanceIds, currentBoard.nowLayer.sort, sortableLiveCardsByInstanceId])

  return { currentBoard, liveCardsByInstanceId, instanceIds }
}
