import type { Atom } from "jotai"
import type { SortableNowLayerLiveCard } from "@/lib/board"
import type { Collection } from "@/lib/collection"
import type { Instance } from "@/lib/source"
import type { SourceDescriptor } from "@/typings/source"
import { useAtomValue } from "jotai"
import { useMemo } from "react"
import { orderNowLayerInstanceIds } from "@/lib/board"
import { boardsAtom, instanceAtomsAtom, instancesAtom } from "@/store/board"
import { useCachedSourceResultFinder } from "./use-cached-source-result"
import { useSourceDescriptors } from "./use-source-descriptors"

export interface NowLayerLiveCard {
  available: boolean
  collectionId: string
  descriptor: SourceDescriptor
  instanceAtom: Atom<Instance>
}

interface NowLayerLiveCardsResult {
  currentBoard: Collection
  liveCardsByInstanceId: Record<string, NowLayerLiveCard>
  instanceIds: string[]
}

function createUnavailableSource(sourceId: string): SourceDescriptor {
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
  const findCachedResult = useCachedSourceResultFinder()
  const { sources } = useSourceDescriptors()
  const currentBoard = boards.find(board => board.id === boardId)!

  const { liveCardsByInstanceId, sortableLiveCardsByInstanceId } = useMemo(() => {
    const descriptorsById = new Map(sources.map(source => [source.id, source]))
    const instancesById = new Map(instances.flatMap((instance, index) => {
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

      const registryDescriptor = descriptorsById.get(instance.sourceId)
      const cachedDescriptor = findCachedResult(
        instance.sourceId,
        instance.patch.params,
      )?.source
      const descriptor = registryDescriptor
        ?? cachedDescriptor
        ?? createUnavailableSource(instance.sourceId)

      nextLiveCards[instanceId] = {
        available: registryDescriptor !== undefined,
        collectionId: boardId,
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
  }, [boardId, currentBoard.instanceIds, findCachedResult, instanceAtoms, instances, sources])

  const instanceIds = useMemo(() => orderNowLayerInstanceIds({
    instanceIds: currentBoard.instanceIds,
    liveCardsByInstanceId: sortableLiveCardsByInstanceId,
    sort: currentBoard.nowLayer.sort,
  }), [currentBoard.instanceIds, currentBoard.nowLayer.sort, sortableLiveCardsByInstanceId])

  return { currentBoard, liveCardsByInstanceId, instanceIds }
}
