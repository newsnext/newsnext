import type { Atom } from "jotai"
import type { Board, SortableNowLayerLiveCard } from "@/lib/board"
import type { Instance } from "@/lib/source"
import type { SourceDescriptor } from "@/typings/source"
import { atom, useAtomValue } from "jotai"
import { useMemo } from "react"
import { orderNowLayerInstanceIds } from "@/lib/board"
import { boardsAtom, instanceAtomsAtom, instancesAtom, nodesAtom } from "@/store/board"
import { useCachedSourceResultFinder } from "./use-cached-source-result"
import { useSourceDescriptors } from "./use-source-descriptors"

export interface NowLayerLiveCard {
  available: boolean
  boardId: string
  descriptor: SourceDescriptor
  instanceAtom: Atom<Instance>
  readOnly: boolean
}

interface NowLayerLiveCardsResult {
  currentBoard: Board
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
  const nodes = useAtomValue(nodesAtom)
  const findCachedResult = useCachedSourceResultFinder()
  const { sources } = useSourceDescriptors()
  const currentBoard = boards.find(board => board.id === boardId)!

  const { liveCardsByInstanceId, sortableLiveCardsByInstanceId } = useMemo(() => {
    const descriptorsById = new Map(sources.map(source => [source.id, source]))
    const instancesById = new Map<string, {
      instance: Instance
      instanceAtom: Atom<Instance>
      readOnly?: true
    }>(instances.flatMap((instance, index) => {
      const instanceAtom = instanceAtoms[index]
      return instanceAtom
        ? [[instance.instanceId, { instance, instanceAtom }] as const]
        : []
    }))
    for (const instance of nodes.flatMap(node => node.instances)) {
      if (!instancesById.has(instance.instanceId)) {
        instancesById.set(instance.instanceId, {
          instance,
          instanceAtom: atom(instance),
          readOnly: true,
        })
      }
    }
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
        instance.instanceId,
      )?.source
      const descriptor = registryDescriptor
        ?? cachedDescriptor
        ?? createUnavailableSource(instance.sourceId)

      nextLiveCards[instanceId] = {
        available: registryDescriptor !== undefined,
        boardId,
        descriptor,
        instanceAtom,
        readOnly: "readOnly" in entry,
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
  }, [boardId, currentBoard.instanceIds, findCachedResult, instanceAtoms, instances, nodes, sources])

  const instanceIds = useMemo(() => orderNowLayerInstanceIds({
    instanceIds: currentBoard.instanceIds,
    liveCardsByInstanceId: sortableLiveCardsByInstanceId,
    sort: currentBoard.nowLayer.sort,
  }), [currentBoard.instanceIds, currentBoard.nowLayer.sort, sortableLiveCardsByInstanceId])

  return { currentBoard, liveCardsByInstanceId, instanceIds }
}
