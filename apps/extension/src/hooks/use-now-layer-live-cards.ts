import type { Atom } from "jotai"
import type { Board, SortableNowLayerLiveCard } from "@/lib/board"
import type { Instance } from "@/lib/source"
import type { SourceDescriptor } from "@/typings/source"
import { useAtomValue } from "jotai"
import { useMemo } from "react"
import { orderNowLayerInstanceIds } from "@/lib/board"
import { boardsAtom, instanceAtomsAtom, instancesAtom } from "@/store/board"
import { useSourceDescriptors } from "./use-source-descriptors"

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
  const currentBoard = boards.find(board => board.id === boardId)!
  const { sources } = useSourceDescriptors()

  const { liveCardsByInstanceId, sortableLiveCardsByInstanceId } = useMemo(() => {
    const descriptorsById = new Map(sources.map(source => [source.id, source]))
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

      const descriptor = descriptorsById.get(instance.sourceId)
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
  }, [boardId, currentBoard.instanceIds, instanceAtoms, instances, sources])

  const instanceIds = useMemo(() => orderNowLayerInstanceIds({
    instanceIds: currentBoard.instanceIds,
    liveCardsByInstanceId: sortableLiveCardsByInstanceId,
    sort: currentBoard.nowLayer.sort,
  }), [currentBoard.instanceIds, currentBoard.nowLayer.sort, sortableLiveCardsByInstanceId])

  return { currentBoard, liveCardsByInstanceId, instanceIds }
}
