import type { Color } from "@newsnext/shared/types"
import type { Board, BoardLayer, BoardSortMode } from "../board"
import { createBoardSortPreference, DEFAULT_BOARD_COLOR, DEFAULT_BOARD_LAYER } from "../board"

export interface Collection {
  createdAt: number
  id: string
  name: string
}

export interface CollectionEntry {
  addedAt: number
  collectionId: string
  instanceId: string
  position: number
}

export interface CollectionView {
  automaticSortMode: Exclude<BoardSortMode, "manual">
  collectionId: string
  color?: Color
  defaultLayer: BoardLayer
  sortMode: BoardSortMode
}

export function projectCollectionBoard(
  collection: Collection,
  view: CollectionView,
  entries: readonly CollectionEntry[],
): Board {
  const manualOrder = entries
    .filter(entry => entry.collectionId === collection.id)
    .toSorted((left, right) => left.position - right.position || left.addedAt - right.addedAt)
    .map(entry => entry.instanceId)

  return {
    defaultLayer: view.defaultLayer,
    id: collection.id,
    name: collection.name,
    color: view.color,
    sort: {
      mode: view.sortMode,
      automaticMode: view.automaticSortMode,
      manualOrder,
    },
  }
}

export function createCollectionView(
  collectionId: string,
  color: Color = DEFAULT_BOARD_COLOR,
  sortMode: BoardSortMode = "createdAt",
  defaultLayer: BoardLayer = DEFAULT_BOARD_LAYER,
): CollectionView {
  const sort = createBoardSortPreference(sortMode)
  return {
    collectionId,
    color,
    defaultLayer,
    sortMode: sort.mode,
    automaticSortMode: sort.automaticMode,
  }
}
