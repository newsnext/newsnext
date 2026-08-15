import type { Color } from "@newsnext/shared/types"
import type { Board, BoardFilter, BoardSortMode, BoardViewMode } from "../board"
import { createBoardSortPreference, DEFAULT_BOARD_COLOR, DEFAULT_BOARD_VIEW_MODE } from "../board"

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
  defaultView: BoardViewMode
  filter?: BoardFilter
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
    defaultView: view.defaultView,
    id: collection.id,
    name: collection.name,
    color: view.color,
    filter: view.filter,
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
  filter?: BoardFilter,
  defaultView: BoardViewMode = DEFAULT_BOARD_VIEW_MODE,
): CollectionView {
  const sort = createBoardSortPreference(sortMode)
  return {
    collectionId,
    color,
    defaultView,
    filter,
    sortMode: sort.mode,
    automaticSortMode: sort.automaticMode,
  }
}
