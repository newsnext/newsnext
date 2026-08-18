import type { Color } from "@newsnext/shared/types"
import type { BoardSortMode, BoardViewMode } from "../board"
import type { CollectionView } from "../collection"
import type { SourceInstancePatch } from "../source/live-cards"
import type { ApplicationData } from "./data"
import { createCollectionView } from "../collection"
import { mergeSourceInstancePatch } from "../source/live-cards"

export interface CollectionViewConfiguration {
  color?: Color
  defaultView?: BoardViewMode
  sortMode?: BoardSortMode
}

interface ApplicationInstanceCreationInput {
  patch: SourceInstancePatch
  sourceId: string
}

export interface ApplicationActionInputMap {
  "collection.create": {
    instances?: ApplicationInstanceCreationInput[]
    name: string
    view?: CollectionViewConfiguration
  }
  "collection.rename": {
    collectionId: string
    name: string
  }
  "collection.update": {
    collectionId: string
    name?: string
    view?: CollectionViewConfiguration
  }
  "view.configureCollection": CollectionViewConfiguration & { collectionId: string }
  "collection.delete": {
    collectionId: string
    deleteInstances?: boolean
  }
  "collection.reorderInstances": { collectionId: string, instanceIds: string[] }
  "collection.addInstance": { collectionId: string, instanceId: string }
  "collection.removeInstance": { collectionId: string, instanceId: string }
  "instance.create": ApplicationInstanceCreationInput & {
    collectionIds: string[]
  }
  "instance.configure": { instanceId: string, patch: SourceInstancePatch }
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
      const view = configureCollectionView(
        createCollectionView(collectionId),
        action.input.view ?? {},
      )
      let nextData: ApplicationData = {
        ...data,
        collections: [...data.collections, {
          id: collectionId,
          name,
          createdAt: dependencies.now(),
        }],
        collectionViews: [...data.collectionViews, view],
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
      if (action.input.name === undefined && action.input.view === undefined) {
        throw new Error("Collection update requires a name or View configuration")
      }
      const name = action.input.name?.trim()
      if (name !== undefined) {
        assertCollectionName(name)
      }
      return {
        data: {
          ...data,
          collections: name === undefined
            ? data.collections
            : data.collections.map(collection => collection.id === collectionId
                ? { ...collection, name }
                : collection),
          collectionViews: action.input.view === undefined
            ? data.collectionViews
            : updateCollectionViews(data, collectionId, action.input.view),
        },
      }
    }
    case "view.configureCollection": {
      const { collectionId } = action.input
      assertCollectionExists(data, collectionId)
      return {
        data: {
          ...data,
          collectionViews: updateCollectionViews(data, collectionId, action.input),
        },
      }
    }
    case "collection.delete": {
      const { collectionId, deleteInstances = false } = action.input
      assertCollectionExists(data, collectionId)
      const deletedInstanceIds = deleteInstances
        ? getExclusiveCollectionInstanceIds(data, collectionId)
        : undefined
      return {
        data: {
          ...data,
          collections: data.collections.filter(collection => collection.id !== collectionId),
          collectionEntries: data.collectionEntries.filter(entry => entry.collectionId !== collectionId),
          collectionViews: data.collectionViews.filter(view => view.collectionId !== collectionId),
          instances: deletedInstanceIds
            ? data.instances.filter(instance => !deletedInstanceIds.has(instance.instanceId))
            : data.instances,
        },
      }
    }
    case "collection.reorderInstances": {
      const { collectionId, instanceIds } = action.input
      assertCollectionExists(data, collectionId)
      const requestedIds = new Set(instanceIds)
      const entries = data.collectionEntries.filter(entry => entry.collectionId === collectionId)
      const existingIds = new Set(entries.map(entry => entry.instanceId))
      if (requestedIds.size !== instanceIds.length
        || requestedIds.size !== existingIds.size
        || instanceIds.some(instanceId => !existingIds.has(instanceId))) {
        throw new Error("Manual order must contain every Collection Instance exactly once")
      }
      const positions = new Map(instanceIds.map((instanceId, position) => [instanceId, position]))
      return {
        data: {
          ...data,
          collectionEntries: data.collectionEntries.map(entry => entry.collectionId === collectionId
            ? { ...entry, position: positions.get(entry.instanceId) ?? entry.position }
            : entry),
          collectionViews: updateCollectionViews(data, collectionId, { sortMode: "manual" }),
        },
      }
    }
    case "collection.addInstance": {
      const { collectionId, instanceId } = action.input
      assertCollectionExists(data, collectionId)
      assertInstanceExists(data, instanceId)
      if (data.collectionEntries.some(entry => entry.collectionId === collectionId
        && entry.instanceId === instanceId)) {
        return { data }
      }
      return {
        data: {
          ...data,
          collectionEntries: [...data.collectionEntries, createCollectionEntry(
            data,
            collectionId,
            instanceId,
            dependencies.now(),
          )],
        },
      }
    }
    case "collection.removeInstance": {
      const { collectionId, instanceId } = action.input
      assertCollectionExists(data, collectionId)
      assertInstanceExists(data, instanceId)
      return {
        data: {
          ...data,
          collectionEntries: data.collectionEntries.filter(entry => (
            entry.collectionId !== collectionId || entry.instanceId !== instanceId
          )),
        },
      }
    }
    case "instance.create": {
      const { collectionIds, patch, sourceId } = action.input
      if (!sourceId.trim()) throw new Error("Source ID is required")
      for (const collectionId of collectionIds) {
        assertCollectionExists(data, collectionId)
      }
      const instanceId = `${sourceId}::${dependencies.createId()}`
      if (data.instances.some(instance => instance.instanceId === instanceId)) {
        throw new Error(`Instance '${instanceId}' already exists`)
      }
      const createdAt = dependencies.now()
      return {
        data: {
          ...data,
          instances: [...data.instances, { instanceId, sourceId, patch, createdAt }],
          collectionEntries: [
            ...data.collectionEntries,
            ...collectionIds.map(collectionId => createCollectionEntry(
              data,
              collectionId,
              instanceId,
              createdAt,
            )),
          ],
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
            ? { ...instance, patch: mergeSourceInstancePatch(instance.patch, action.input.patch) }
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
          collectionEntries: data.collectionEntries.filter(entry => entry.instanceId !== action.input.instanceId),
        },
      }
  }
}

function getExclusiveCollectionInstanceIds(
  data: ApplicationData,
  collectionId: string,
): Set<string> {
  const otherCollectionInstanceIds = new Set(data.collectionEntries
    .filter(entry => entry.collectionId !== collectionId)
    .map(entry => entry.instanceId))
  return new Set(data.collectionEntries
    .filter(entry => entry.collectionId === collectionId
      && !otherCollectionInstanceIds.has(entry.instanceId))
    .map(entry => entry.instanceId))
}

function updateCollectionViews(
  data: ApplicationData,
  collectionId: string,
  configuration: CollectionViewConfiguration,
): CollectionView[] {
  if (!data.collectionViews.some(view => view.collectionId === collectionId)) {
    throw new Error(`Collection View '${collectionId}' not found`)
  }
  return data.collectionViews.map(view => view.collectionId === collectionId
    ? configureCollectionView(view, configuration)
    : view)
}

function configureCollectionView(
  view: CollectionView,
  configuration: CollectionViewConfiguration,
): CollectionView {
  const sortMode = configuration.sortMode ?? view.sortMode
  return {
    ...view,
    ...(configuration.color !== undefined ? { color: configuration.color } : {}),
    ...(configuration.defaultView !== undefined ? { defaultView: configuration.defaultView } : {}),
    sortMode,
    automaticSortMode: sortMode === "manual" ? view.automaticSortMode : sortMode,
  }
}

function createCollectionEntry(
  data: ApplicationData,
  collectionId: string,
  instanceId: string,
  addedAt: number,
) {
  const position = data.collectionEntries.reduce((maximum, entry) => (
    entry.collectionId === collectionId ? Math.max(maximum, entry.position) : maximum
  ), -1) + 1
  return { addedAt, collectionId, instanceId, position }
}

function assertCollectionExists(data: ApplicationData, collectionId: string): void {
  if (!data.collections.some(collection => collection.id === collectionId)) {
    throw new Error(`Collection '${collectionId}' not found`)
  }
}

function assertInstanceExists(data: ApplicationData, instanceId: string): void {
  if (!data.instances.some(instance => instance.instanceId === instanceId)) {
    throw new Error(`Instance '${instanceId}' not found`)
  }
}

function assertCollectionName(name: string): void {
  if (!name) throw new Error("Collection name is required")
}
