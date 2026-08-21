import type { Color } from "@newsnext/shared/types"
import type { Board, BoardLayer, NowLayerSortMode } from "../board"
import { createNowLayerSort, DEFAULT_BOARD_COLOR, DEFAULT_BOARD_LAYER } from "../board"

export interface Collection extends Board {
  createdAt: number
  instanceIds: string[]
}

export function createCollection(
  id: string,
  name: string,
  createdAt: number,
  color: Color = DEFAULT_BOARD_COLOR,
  sortMode: NowLayerSortMode = "addedAt",
  defaultLayer: BoardLayer = DEFAULT_BOARD_LAYER,
): Collection {
  return {
    createdAt,
    defaultLayer,
    id,
    instanceIds: [],
    name,
    nowLayer: {
      color,
      sort: createNowLayerSort(sortMode),
    },
  }
}

export function indexCollectionIdsByInstance(
  collections: readonly Collection[],
): Map<string, string[]> {
  const collectionIdsByInstance = new Map<string, string[]>()
  for (const collection of collections) {
    for (const instanceId of collection.instanceIds) {
      const collectionIds = collectionIdsByInstance.get(instanceId) ?? []
      collectionIds.push(collection.id)
      collectionIdsByInstance.set(instanceId, collectionIds)
    }
  }
  return collectionIdsByInstance
}
