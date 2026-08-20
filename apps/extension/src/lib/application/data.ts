import type { Collection, CollectionEntry, CollectionView } from "../collection"
import type { SourceInstance } from "../source"
import { INITIAL_BOARD_NAME } from "../board"
import { createCollectionView } from "../collection"
import { createId } from "../id"

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

export function createInitialApplicationData(
  boardId: string = createId(),
  createdAt: number = Date.now(),
): ApplicationData {
  return {
    collectionEntries: [],
    collectionViews: [createCollectionView(boardId)],
    collections: [{
      createdAt,
      id: boardId,
      name: INITIAL_BOARD_NAME,
    }],
    instances: [],
  }
}

export function ensureApplicationDataIntegrity(
  data: ApplicationData,
  boardId?: string,
  createdAt?: number,
): ApplicationData {
  const initialized = data.collections.length > 0
    ? data
    : {
        ...createInitialApplicationData(boardId ?? createId(), createdAt ?? Date.now()),
        instances: data.instances,
      }
  const assignedInstanceIds = new Set(initialized.collectionEntries.map(entry => entry.instanceId))
  const unassignedInstances = initialized.instances.filter(instance => !assignedInstanceIds.has(instance.instanceId))
  if (unassignedInstances.length === 0) return initialized

  const fallbackBoardId = initialized.collections[0]!.id
  const initialPosition = initialized.collectionEntries.reduce((maximum, entry) => (
    entry.collectionId === fallbackBoardId ? Math.max(maximum, entry.position) : maximum
  ), -1) + 1
  return {
    ...initialized,
    collectionEntries: [...initialized.collectionEntries, ...unassignedInstances.map((instance, index) => ({
      addedAt: instance.createdAt,
      collectionId: fallbackBoardId,
      instanceId: instance.instanceId,
      position: initialPosition + index,
    }))],
  }
}
