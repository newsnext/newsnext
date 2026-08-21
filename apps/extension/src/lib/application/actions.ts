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

export interface ApplicationActionInputMap {
  "collection.create": {
    board?: BoardConfiguration
    instances?: ApplicationInstanceCreationInput[]
    name: string
  }
  "collection.rename": {
    collectionId: string
    name: string
  }
  "collection.update": {
    board?: BoardConfiguration
    collectionId: string
    name?: string
  }
  "board.configure": BoardConfiguration & { collectionId: string }
  "collection.delete": CollectionDeleteInput
  "nowLayer.setManualOrder": { collectionId: string, instanceIds: string[] }
  "collection.addInstance": { collectionId: string, instanceId: string }
  "collection.removeInstance": { collectionId: string, instanceId: string }
  "instance.create": ApplicationInstanceCreationInput & {
    collectionIds: string[]
  }
  "instance.configure": { instanceId: string, patch: InstancePatch }
  "instance.resetParams": { instanceId: string }
  "instance.delete": { instanceId: string }
}

export type ApplicationActionName = keyof ApplicationActionInputMap

export type ApplicationAction = {
  [Name in ApplicationActionName]: {
    type: Name
    input: ApplicationActionInputMap[Name]
  }
}[ApplicationActionName]

export interface ApplicationActionDependencies {
  createId: () => string
  now: () => number
}

export interface ApplicationActionExecution {
  data: ApplicationData
  result?: ApplicationActionResult
}

export interface ApplicationActionResult {
  collectionId?: string
  instanceId?: string
}

export function executeApplicationAction(
  data: ApplicationData,
  action: ApplicationAction,
  dependencies: ApplicationActionDependencies,
): ApplicationActionExecution {
  switch (action.type) {
    case "collection.create": {
      const name = action.input.name.trim()
      assertCollectionName(name)
      const collectionId = dependencies.createId()
      const collection = configureBoard(
        createCollection(collectionId, name, dependencies.now()),
        action.input.board ?? {},
      )
      let nextData: ApplicationData = {
        ...data,
        collections: [...data.collections, collection],
      }
      for (const instance of action.input.instances ?? []) {
        nextData = executeApplicationAction(nextData, {
          type: "instance.create",
          input: { ...instance, collectionIds: [collectionId] },
        }, dependencies).data
      }
      return {
        data: nextData,
        result: { collectionId },
      }
    }
    case "collection.rename": {
      const { collectionId } = action.input
      const name = action.input.name.trim()
      assertCollectionExists(data, collectionId)
      assertCollectionName(name)
      return {
        data: {
          ...data,
          collections: data.collections.map(collection => collection.id === collectionId
            ? { ...collection, name }
            : collection),
        },
      }
    }
    case "collection.update": {
      const { collectionId } = action.input
      assertCollectionExists(data, collectionId)
      if (action.input.name === undefined && action.input.board === undefined) {
        throw new Error("Collection update requires a name or Board configuration")
      }
      const name = action.input.name?.trim()
      if (name !== undefined) assertCollectionName(name)
      return {
        data: {
          ...data,
          collections: data.collections.map(collection => collection.id === collectionId
            ? configureBoard({
                ...collection,
                ...(name !== undefined ? { name } : {}),
              }, action.input.board ?? {})
            : collection),
        },
      }
    }
    case "board.configure": {
      const { collectionId } = action.input
      assertCollectionExists(data, collectionId)
      return {
        data: {
          ...data,
          collections: data.collections.map(collection => collection.id === collectionId
            ? configureBoard(collection, action.input)
            : collection),
        },
      }
    }
    case "collection.delete": {
      const { collectionId, targetCollectionId } = action.input
      const deleteInstances = action.input.deleteInstances === true
      const collection = getCollection(data, collectionId)
      if (data.collections.length === 1) {
        throw new Error("NewsNext must keep at least one Board")
      }
      if (!deleteInstances) {
        if (targetCollectionId === undefined) {
          throw new Error("Collection deletion requires a transfer target")
        }
        if (targetCollectionId === collectionId) {
          throw new Error("Collection transfer target must differ from the deleted Collection")
        }
        assertCollectionExists(data, targetCollectionId)
      }

      let instances = data.instances
      if (deleteInstances) {
        const exclusiveInstanceIds = getExclusiveCollectionInstanceIds(data, collectionId)
        instances = data.instances.filter(instance => !exclusiveInstanceIds.has(instance.instanceId))
      }
      return {
        data: {
          ...data,
          collections: data.collections.flatMap((candidate) => {
            if (candidate.id === collectionId) return []
            if (!deleteInstances && candidate.id === targetCollectionId) {
              return [collection.instanceIds
                .toReversed()
                .reduce(addInstanceToCollection, candidate)]
            }
            return [candidate]
          }),
          instances,
        },
      }
    }
    case "nowLayer.setManualOrder": {
      const { collectionId, instanceIds } = action.input
      const collection = getCollection(data, collectionId)
      assertCompleteInstanceOrder(collection.instanceIds, instanceIds)
      return {
        data: {
          ...data,
          collections: data.collections.map(candidate => candidate.id === collectionId
            ? {
                ...candidate,
                nowLayer: {
                  ...candidate.nowLayer,
                  sort: {
                    ...candidate.nowLayer.sort,
                    mode: "manual",
                    manualOrder: instanceIds,
                  },
                },
              }
            : candidate),
        },
      }
    }
    case "collection.addInstance": {
      const { collectionId, instanceId } = action.input
      assertCollectionExists(data, collectionId)
      assertInstanceExists(data, instanceId)
      return {
        data: {
          ...data,
          collections: data.collections.map(collection => collection.id === collectionId
            ? addInstanceToCollection(collection, instanceId)
            : collection),
        },
      }
    }
    case "collection.removeInstance": {
      const { collectionId, instanceId } = action.input
      assertCollectionExists(data, collectionId)
      assertInstanceExists(data, instanceId)
      const membershipCount = data.collections.filter(collection => collection.instanceIds.includes(instanceId)).length
      if (membershipCount <= 1 && getCollection(data, collectionId).instanceIds.includes(instanceId)) {
        throw new Error("A LiveCard must belong to at least one Board")
      }
      return {
        data: {
          ...data,
          collections: data.collections.map(collection => collection.id === collectionId
            ? removeInstanceFromCollection(collection, instanceId)
            : collection),
        },
      }
    }
    case "instance.create": {
      const { collectionIds, patch, sourceId } = action.input
      if (!sourceId.trim()) throw new Error("Source ID is required")
      const uniqueCollectionIds = [...new Set(collectionIds)]
      if (uniqueCollectionIds.length === 0) {
        throw new Error("A LiveCard must belong to at least one Board")
      }
      for (const collectionId of uniqueCollectionIds) assertCollectionExists(data, collectionId)
      const instanceId = `${sourceId}::${dependencies.createId()}`
      if (data.instances.some(instance => instance.instanceId === instanceId)) {
        throw new Error(`Instance '${instanceId}' already exists`)
      }
      const createdAt = dependencies.now()
      return {
        data: {
          ...data,
          instances: [...data.instances, { instanceId, sourceId, patch, createdAt }],
          collections: data.collections.map(collection => uniqueCollectionIds.includes(collection.id)
            ? addInstanceToCollection(collection, instanceId)
            : collection),
        },
        result: { instanceId },
      }
    }
    case "instance.configure":
      assertInstanceExists(data, action.input.instanceId)
      return {
        data: {
          ...data,
          instances: data.instances.map(instance => instance.instanceId === action.input.instanceId
            ? { ...instance, patch: mergeInstancePatch(instance.patch, action.input.patch) }
            : instance),
        },
      }
    case "instance.resetParams":
      assertInstanceExists(data, action.input.instanceId)
      return {
        data: {
          ...data,
          instances: data.instances.map(instance => instance.instanceId === action.input.instanceId
            ? { ...instance, patch: { ...instance.patch, params: {} } }
            : instance),
        },
      }
    case "instance.delete":
      assertInstanceExists(data, action.input.instanceId)
      return {
        data: {
          ...data,
          instances: data.instances.filter(instance => instance.instanceId !== action.input.instanceId),
          collections: data.collections.map(collection => (
            removeInstanceFromCollection(collection, action.input.instanceId)
          )),
        },
      }
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
