import type { SourceDescriptor } from "@newsnext/source/types"
import type { Collection, CollectionEntry, CollectionView } from "../collection"
import type { SourceInstance } from "../source/cards"
import type { ApplicationData } from "./data"
import { ALL_BOARD_ID, ALL_BOARD_NAME } from "../board"

export type ApplicationQuery
  = | { type: "source.list" }
    | { type: "source.get", input: { sourceId: string } }
    | { type: "collection.list" }
    | { type: "collection.get", input: { collectionId: string } }
    | { type: "collection.listInstances", input: { collectionId: string } }
    | { type: "instance.list" }
    | { type: "instance.get", input: { instanceId: string } }
    | { type: "view.getContext" }
    | { type: "view.getCollection", input: { collectionId: string } }
    | { type: "view.getVisibleCards" }

export interface ApplicationQueryContext {
  currentBoardId?: string
  sources?: readonly SourceDescriptor[]
}

export interface ApplicationViewContext {
  boardId: string
  boardName: string
  collectionId: string | null
}

export interface ApplicationVisibleCard {
  collectionId: string | null
  collectionIds: string[]
  instanceId: string
  sourceId: string
}

export interface CollectionDetail {
  collection: Collection
  entries: CollectionEntry[]
  instances: SourceInstance[]
}

export type ApplicationQueryResult<Query extends ApplicationQuery>
  = Query extends { type: "source.list" }
    ? SourceDescriptor[]
    : Query extends { type: "source.get" }
      ? SourceDescriptor
      : Query extends { type: "collection.list" }
        ? Collection[]
        : Query extends { type: "collection.get" }
          ? CollectionDetail
          : Query extends { type: "collection.listInstances" }
            ? SourceInstance[]
            : Query extends { type: "instance.list" }
              ? SourceInstance[]
              : Query extends { type: "instance.get" }
                ? SourceInstance
                : Query extends { type: "view.getContext" }
                  ? ApplicationViewContext
                  : Query extends { type: "view.getCollection" }
                    ? CollectionView
                    : Query extends { type: "view.getVisibleCards" }
                      ? ApplicationVisibleCard[]
                      : never

export function executeApplicationQuery<Query extends ApplicationQuery>(
  data: ApplicationData,
  query: Query,
  context?: ApplicationQueryContext,
): ApplicationQueryResult<Query> {
  switch (query.type) {
    case "source.list":
      return [...requireSources(context)] as ApplicationQueryResult<Query>
    case "source.get": {
      const source = requireSources(context).find(candidate => candidate.id === query.input.sourceId)
      if (!source) throw new Error(`Source '${query.input.sourceId}' not found`)
      return source as ApplicationQueryResult<Query>
    }
    case "collection.list":
      return data.collections as ApplicationQueryResult<Query>
    case "collection.get": {
      const collection = getCollection(data, query.input.collectionId)
      const entries = getCollectionEntries(data, collection.id)
      return {
        collection,
        entries,
        instances: resolveEntryInstances(data, entries),
      } as ApplicationQueryResult<Query>
    }
    case "collection.listInstances":
      return resolveEntryInstances(
        data,
        getCollectionEntries(data, query.input.collectionId),
      ) as ApplicationQueryResult<Query>
    case "instance.list":
      return data.instances as ApplicationQueryResult<Query>
    case "instance.get": {
      const instance = data.instances.find(candidate => candidate.instanceId === query.input.instanceId)
      if (!instance) throw new Error(`Instance '${query.input.instanceId}' not found`)
      return instance as ApplicationQueryResult<Query>
    }
    case "view.getContext":
      return resolveViewContext(data, context) as ApplicationQueryResult<Query>
    case "view.getCollection": {
      getCollection(data, query.input.collectionId)
      const view = data.collectionViews.find(candidate => candidate.collectionId === query.input.collectionId)
      if (!view) throw new Error(`Collection View '${query.input.collectionId}' not found`)
      return view as ApplicationQueryResult<Query>
    }
    case "view.getVisibleCards": {
      const view = resolveViewContext(data, context)
      const collectionIdsByInstance = new Map<string, string[]>()
      for (const entry of data.collectionEntries) {
        const collectionIds = collectionIdsByInstance.get(entry.instanceId) ?? []
        collectionIds.push(entry.collectionId)
        collectionIdsByInstance.set(entry.instanceId, collectionIds)
      }
      const instances = view.collectionId === null
        ? data.instances
        : resolveEntryInstances(data, getCollectionEntries(data, view.collectionId))
      return instances.map(instance => ({
        collectionId: view.collectionId,
        collectionIds: collectionIdsByInstance.get(instance.instanceId) ?? [],
        instanceId: instance.instanceId,
        sourceId: instance.sourceId,
      })) as ApplicationQueryResult<Query>
    }
  }
}

function requireSources(context: ApplicationQueryContext | undefined): readonly SourceDescriptor[] {
  if (!context?.sources) throw new Error("Source registry is unavailable")
  return context.sources
}

function resolveViewContext(
  data: ApplicationData,
  context: ApplicationQueryContext | undefined,
): ApplicationViewContext {
  const collection = data.collections.find(candidate => candidate.id === context?.currentBoardId)
  return collection
    ? { boardId: collection.id, boardName: collection.name, collectionId: collection.id }
    : { boardId: ALL_BOARD_ID, boardName: ALL_BOARD_NAME, collectionId: null }
}

function getCollection(data: ApplicationData, collectionId: string): Collection {
  const collection = data.collections.find(candidate => candidate.id === collectionId)
  if (!collection) throw new Error(`Collection '${collectionId}' not found`)
  return collection
}

function getCollectionEntries(data: ApplicationData, collectionId: string): CollectionEntry[] {
  getCollection(data, collectionId)
  return data.collectionEntries
    .filter(entry => entry.collectionId === collectionId)
    .toSorted((left, right) => left.position - right.position || left.addedAt - right.addedAt)
}

function resolveEntryInstances(
  data: ApplicationData,
  entries: readonly CollectionEntry[],
): SourceInstance[] {
  const instances = new Map(data.instances.map(instance => [instance.instanceId, instance]))
  return entries.flatMap((entry) => {
    const instance = instances.get(entry.instanceId)
    return instance ? [instance] : []
  })
}
