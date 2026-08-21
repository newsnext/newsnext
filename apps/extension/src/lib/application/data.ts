import type { Collection } from "../collection"
import type { Instance } from "../source"
import { INITIAL_BOARD_NAME } from "../board"
import { createCollection } from "../collection"
import { createId } from "../id"

export const APPLICATION_DATA_VERSION = 2 as const

export interface ApplicationData {
  version: typeof APPLICATION_DATA_VERSION
  collections: Collection[]
  instances: Instance[]
}

export function createEmptyApplicationData(): ApplicationData {
  return {
    version: APPLICATION_DATA_VERSION,
    collections: [],
    instances: [],
  }
}

export function createInitialApplicationData(
  boardId: string = createId(),
  createdAt: number = Date.now(),
): ApplicationData {
  return {
    version: APPLICATION_DATA_VERSION,
    collections: [createCollection(boardId, INITIAL_BOARD_NAME, createdAt)],
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
  const assignedInstanceIds = new Set(initialized.collections.flatMap(collection => collection.instanceIds))
  const unassignedInstanceIds = initialized.instances
    .filter(instance => !assignedInstanceIds.has(instance.instanceId))
    .toSorted((left, right) => right.createdAt - left.createdAt || left.instanceId.localeCompare(right.instanceId))
    .map(instance => instance.instanceId)
  if (unassignedInstanceIds.length === 0) return initialized

  const fallbackCollection = initialized.collections[0]!
  const instanceIds = [...unassignedInstanceIds, ...fallbackCollection.instanceIds]
  return {
    ...initialized,
    collections: initialized.collections.map(collection => collection.id === fallbackCollection.id
      ? {
          ...collection,
          instanceIds,
          nowLayer: {
            ...collection.nowLayer,
            sort: {
              ...collection.nowLayer.sort,
              manualOrder: [...unassignedInstanceIds, ...collection.nowLayer.sort.manualOrder],
            },
          },
        }
      : collection),
  }
}
