import type { Color } from "@newsnext/shared/types"
import type { BoardFilter, BoardSortMode, BoardViewMode } from "../board"
import type { CollectionView } from "../collection"
import type { SourceInstancePatch } from "../source/cards"
import type { ApplicationData } from "./data"
import { createCollectionView } from "../collection"
import { mergeSourceInstancePatch } from "../source/cards"

export interface CollectionViewConfiguration {
  color?: Color
  defaultView?: BoardViewMode
  filter?: BoardFilter | null
  sortMode?: BoardSortMode
}

export interface ApplicationActionInputMap {
  "collection.create": {
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
  "collection.delete": { collectionId: string }
  "collection.reorderInstances": { collectionId: string, instanceIds: string[] }
  "collection.addInstance": { collectionId: string, instanceId: string }
  "collection.removeInstance": { collectionId: string, instanceId: string }
  "instance.create": {
    collectionId: string | null
    patch: SourceInstancePatch
    sourceId: string
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
      assertCollectionNameAvailable(data, name)
      const collectionId = dependencies.createId()
      const view = configureCollectionView(
        createCollectionView(collectionId),
        action.input.view ?? {},
      )
      return {
        data: {
          ...data,
          collections: [...data.collections, {
            id: collectionId,
            name,
            createdAt: dependencies.now(),
          }],
          collectionViews: [...data.collectionViews, view],
        },
        result: { collectionId },
      }
    }
    case "collection.rename": {
      const { collectionId } = action.input
      const name = action.input.name.trim()
      assertCollectionExists(data, collectionId)
      assertCollectionNameAvailable(data, name, collectionId)
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
        assertCollectionNameAvailable(data, name, collectionId)
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
      const { collectionId } = action.input
      assertCollectionExists(data, collectionId)
      return {
        data: {
          ...data,
          collections: data.collections.filter(collection => collection.id !== collectionId),
          collectionEntries: data.collectionEntries.filter(entry => entry.collectionId !== collectionId),
          collectionViews: data.collectionViews.filter(view => view.collectionId !== collectionId),
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
      const { collectionId, patch, sourceId } = action.input
      if (!sourceId.trim()) throw new Error("Source ID is required")
      if (collectionId) assertCollectionExists(data, collectionId)
      const instanceId = `${sourceId}::${dependencies.createId()}`
      if (data.instances.some(instance => instance.instanceId === instanceId)) {
        throw new Error(`Instance '${instanceId}' already exists`)
      }
      const createdAt = dependencies.now()
      return {
        data: {
          ...data,
          instances: [...data.instances, { instanceId, sourceId, patch, createdAt }],
          collectionEntries: collectionId
            ? [...data.collectionEntries, createCollectionEntry(
                data,
                collectionId,
                instanceId,
                createdAt,
              )]
            : data.collectionEntries,
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
    ...(Object.hasOwn(configuration, "filter")
      ? { filter: configuration.filter ?? undefined }
      : {}),
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

function assertCollectionNameAvailable(
  data: ApplicationData,
  name: string,
  excludedCollectionId?: string,
): void {
  if (!name) throw new Error("Collection name is required")
  if (data.collections.some(collection => collection.id !== excludedCollectionId
    && collection.name.localeCompare(name, undefined, { sensitivity: "accent" }) === 0)) {
    throw new Error(`Collection '${name}' already exists`)
  }
}
