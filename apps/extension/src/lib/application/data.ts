import type { Collection, CollectionEntry, CollectionView } from "../collection"
import type { SourceInstance } from "../source"

export interface ApplicationData {
  collectionEntries: CollectionEntry[]
  collectionViews: CollectionView[]
  collections: Collection[]
  instances: SourceInstance[]
}

export function createEmptyApplicationData(): ApplicationData {
  return {
    collectionEntries: [],
    collectionViews: [],
    collections: [],
    instances: [],
  }
}
