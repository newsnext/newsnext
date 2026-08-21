import type { Color } from "@newsnext/shared/types"
import type { BoardLayer, NowLayerSortMode } from "../board"
import type { Collection } from "../collection"
import type { InstancePatch } from "../source/live-cards"
import type { ApplicationData } from "./data"
import { createCollection } from "../collection"
import { mergeInstancePatch } from "../source/live-cards"

export interface BoardConfiguration {
  color?: Color
  defaultLayer?: BoardLayer
  sortMode?: NowLayerSortMode
}

interface ApplicationInstanceCreationInput {
  patch: InstancePatch
  sourceId: string
}

export type CollectionDeleteInput
  = | { collectionId: string, deleteInstances: true, targetCollectionId?: never }
    | { collectionId: string, deleteInstances?: never, targetCollectionId: string }

export interface ApplicationMutationDependencies {
  createId: () => string
  now: () => number
}

export interface ApplicationMutationExecution {
  data: ApplicationData
  result?: ApplicationMutationResult
}

export interface ApplicationMutationResult {
  collectionId?: string
  instanceId?: string
}

export function createCollectionMutation(
  data: ApplicationData,
  input: {
    board?: BoardConfiguration
    instances?: ApplicationInstanceCreationInput[]
    name: string
  },
  dependencies: ApplicationMutationDependencies,
): ApplicationMutationExecution {
  const name = input.name.trim()
  assertCollectionName(name)
  const collectionId = dependencies.createId()
  const collection = configureBoard(
    createCollection(collectionId, name, dependencies.now()),
    input.board ?? {},
  )
  let nextData: ApplicationData = {
    ...data,
    collections: [...data.collections, collection],
  }
  for (const instance of input.instances ?? []) {
    nextData = createInstanceMutation(nextData, {
      ...instance,
      collectionIds: [collectionId],
    }, dependencies).data
  }
  return { data: nextData, result: { collectionId } }
}

export function renameCollectionMutation(
  data: ApplicationData,
  input: { collectionId: string, name: string },
): ApplicationMutationExecution {
  const name = input.name.trim()
  assertCollectionExists(data, input.collectionId)
  assertCollectionName(name)
  return {
    data: {
      ...data,
      collections: data.collections.map(collection => collection.id === input.collectionId
        ? { ...collection, name }
        : collection),
    },
  }
}

export function updateCollectionMutation(
  data: ApplicationData,
  input: { board?: BoardConfiguration, collectionId: string, name?: string },
): ApplicationMutationExecution {
  assertCollectionExists(data, input.collectionId)
  if (input.name === undefined && input.board === undefined) {
    throw new Error("Collection update requires a name or Board configuration")
  }
  const name = input.name?.trim()
  if (name !== undefined) assertCollectionName(name)
  return {
    data: {
      ...data,
      collections: data.collections.map(collection => collection.id === input.collectionId
        ? configureBoard({
            ...collection,
            ...(name !== undefined ? { name } : {}),
          }, input.board ?? {})
        : collection),
    },
  }
}

export function configureBoardMutation(
  data: ApplicationData,
  input: BoardConfiguration & { collectionId: string },
): ApplicationMutationExecution {
  assertCollectionExists(data, input.collectionId)
  return {
    data: {
      ...data,
      collections: data.collections.map(collection => collection.id === input.collectionId
        ? configureBoard(collection, input)
        : collection),
    },
  }
}

export function deleteCollectionMutation(
  data: ApplicationData,
  input: CollectionDeleteInput,
): ApplicationMutationExecution {
  const { collectionId, targetCollectionId } = input
  const deleteInstances = input.deleteInstances === true
  const collection = getCollection(data, collectionId)
  if (data.collections.length === 1) throw new Error("NewsNext must keep at least one Board")
  if (!deleteInstances) {
    if (targetCollectionId === undefined) throw new Error("Collection deletion requires a transfer target")
    if (targetCollectionId === collectionId) {
      throw new Error("Collection transfer target must differ from the deleted Collection")
    }
    assertCollectionExists(data, targetCollectionId)
  }
  const instances = deleteInstances
    ? data.instances.filter(instance => !getExclusiveCollectionInstanceIds(data, collectionId).has(instance.instanceId))
    : data.instances
  return {
    data: {
      ...data,
      collections: data.collections.flatMap((candidate) => {
        if (candidate.id === collectionId) return []
        if (!deleteInstances && candidate.id === targetCollectionId) {
          return [collection.instanceIds.toReversed().reduce(addInstanceToCollection, candidate)]
        }
        return [candidate]
      }),
      instances,
    },
  }
}

export function setNowLayerManualOrderMutation(
  data: ApplicationData,
  input: { collectionId: string, instanceIds: string[] },
): ApplicationMutationExecution {
  const collection = getCollection(data, input.collectionId)
  assertCompleteInstanceOrder(collection.instanceIds, input.instanceIds)
  return {
    data: {
      ...data,
      collections: data.collections.map(candidate => candidate.id === input.collectionId
        ? {
            ...candidate,
            nowLayer: {
              ...candidate.nowLayer,
              sort: { ...candidate.nowLayer.sort, mode: "manual", manualOrder: input.instanceIds },
            },
          }
        : candidate),
    },
  }
}

export function addCollectionInstanceMutation(
  data: ApplicationData,
  input: { collectionId: string, instanceId: string },
): ApplicationMutationExecution {
  assertCollectionExists(data, input.collectionId)
  assertInstanceExists(data, input.instanceId)
  return {
    data: {
      ...data,
      collections: data.collections.map(collection => collection.id === input.collectionId
        ? addInstanceToCollection(collection, input.instanceId)
        : collection),
    },
  }
}

export function removeCollectionInstanceMutation(
  data: ApplicationData,
  input: { collectionId: string, instanceId: string },
): ApplicationMutationExecution {
  assertCollectionExists(data, input.collectionId)
  assertInstanceExists(data, input.instanceId)
  const membershipCount = data.collections.filter(collection => collection.instanceIds.includes(input.instanceId)).length
  if (membershipCount <= 1 && getCollection(data, input.collectionId).instanceIds.includes(input.instanceId)) {
    throw new Error("A LiveCard must belong to at least one Board")
  }
  return {
    data: {
      ...data,
      collections: data.collections.map(collection => collection.id === input.collectionId
        ? removeInstanceFromCollection(collection, input.instanceId)
        : collection),
    },
  }
}

export function createInstanceMutation(
  data: ApplicationData,
  input: ApplicationInstanceCreationInput & { collectionIds: string[] },
  dependencies: ApplicationMutationDependencies,
): ApplicationMutationExecution {
  const { collectionIds, patch, sourceId } = input
  if (!sourceId.trim()) throw new Error("Source ID is required")
  const uniqueCollectionIds = [...new Set(collectionIds)]
  if (uniqueCollectionIds.length === 0) throw new Error("A LiveCard must belong to at least one Board")
  for (const collectionId of uniqueCollectionIds) assertCollectionExists(data, collectionId)
  const instanceId = `${sourceId}::${dependencies.createId()}`
  if (data.instances.some(instance => instance.instanceId === instanceId)) {
    throw new Error(`Instance '${instanceId}' already exists`)
  }
  return {
    data: {
      ...data,
      instances: [...data.instances, {
        instanceId,
        sourceId,
        patch,
        createdAt: dependencies.now(),
      }],
      collections: data.collections.map(collection => uniqueCollectionIds.includes(collection.id)
        ? addInstanceToCollection(collection, instanceId)
        : collection),
    },
    result: { instanceId },
  }
}

export function configureInstanceMutation(
  data: ApplicationData,
  input: { instanceId: string, patch: InstancePatch },
): ApplicationMutationExecution {
  assertInstanceExists(data, input.instanceId)
  return {
    data: {
      ...data,
      instances: data.instances.map(instance => instance.instanceId === input.instanceId
        ? { ...instance, patch: mergeInstancePatch(instance.patch, input.patch) }
        : instance),
    },
  }
}

export function resetInstanceParamsMutation(
  data: ApplicationData,
  input: { instanceId: string },
): ApplicationMutationExecution {
  assertInstanceExists(data, input.instanceId)
  return {
    data: {
      ...data,
      instances: data.instances.map(instance => instance.instanceId === input.instanceId
        ? { ...instance, patch: { ...instance.patch, params: {} } }
        : instance),
    },
  }
}

export function deleteInstanceMutation(
  data: ApplicationData,
  input: { instanceId: string },
): ApplicationMutationExecution {
  assertInstanceExists(data, input.instanceId)
  return {
    data: {
      ...data,
      instances: data.instances.filter(instance => instance.instanceId !== input.instanceId),
      collections: data.collections.map(collection => removeInstanceFromCollection(collection, input.instanceId)),
    },
  }
}

function addInstanceToCollection(collection: Collection, instanceId: string): Collection {
  if (collection.instanceIds.includes(instanceId)) return collection
  const manualOrder = [
    instanceId,
    ...collection.nowLayer.sort.manualOrder.filter(candidate => candidate !== instanceId),
  ]
  return {
    ...collection,
    instanceIds: [instanceId, ...collection.instanceIds],
    nowLayer: {
      ...collection.nowLayer,
      sort: { ...collection.nowLayer.sort, manualOrder },
    },
  }
}

function removeInstanceFromCollection(collection: Collection, instanceId: string): Collection {
  if (!collection.instanceIds.includes(instanceId)) return collection
  return {
    ...collection,
    instanceIds: collection.instanceIds.filter(candidate => candidate !== instanceId),
    nowLayer: {
      ...collection.nowLayer,
      sort: {
        ...collection.nowLayer.sort,
        manualOrder: collection.nowLayer.sort.manualOrder.filter(candidate => candidate !== instanceId),
      },
    },
  }
}

function getExclusiveCollectionInstanceIds(
  data: ApplicationData,
  collectionId: string,
): Set<string> {
  const collection = getCollection(data, collectionId)
  const otherCollectionInstanceIds = new Set(data.collections
    .filter(candidate => candidate.id !== collectionId)
    .flatMap(candidate => candidate.instanceIds))
  return new Set(collection.instanceIds.filter(instanceId => !otherCollectionInstanceIds.has(instanceId)))
}

function configureBoard(
  collection: Collection,
  configuration: BoardConfiguration,
): Collection {
  const sortMode = configuration.sortMode ?? collection.nowLayer.sort.mode
  return {
    ...collection,
    ...(configuration.defaultLayer !== undefined ? { defaultLayer: configuration.defaultLayer } : {}),
    nowLayer: {
      ...collection.nowLayer,
      ...(configuration.color !== undefined ? { color: configuration.color } : {}),
      sort: {
        ...collection.nowLayer.sort,
        mode: sortMode,
        automaticMode: sortMode === "manual"
          ? collection.nowLayer.sort.automaticMode
          : sortMode,
      },
    },
  }
}

function assertCompleteInstanceOrder(existingIds: string[], requestedIds: string[]): void {
  const existing = new Set(existingIds)
  const requested = new Set(requestedIds)
  if (requested.size !== requestedIds.length
    || requested.size !== existing.size
    || requestedIds.some(instanceId => !existing.has(instanceId))) {
    throw new Error("Manual order must contain every Collection Instance exactly once")
  }
}

function getCollection(data: ApplicationData, collectionId: string): Collection {
  const collection = data.collections.find(candidate => candidate.id === collectionId)
  if (!collection) throw new Error(`Collection '${collectionId}' not found`)
  return collection
}

function assertCollectionExists(data: ApplicationData, collectionId: string): void {
  getCollection(data, collectionId)
}

function assertInstanceExists(data: ApplicationData, instanceId: string): void {
  if (!data.instances.some(instance => instance.instanceId === instanceId)) {
    throw new Error(`Instance '${instanceId}' not found`)
  }
}

function assertCollectionName(name: string): void {
  if (!name) throw new Error("Collection name is required")
}
