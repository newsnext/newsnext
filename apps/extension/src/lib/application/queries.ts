import type { SourceDescriptor } from "@newsnext/source-kit/types"
import type { Collection } from "../collection"
import type { Instance } from "../source/live-cards"
import type { ApplicationData } from "./data"
import { indexCollectionIdsByInstance } from "../collection"

export type ApplicationQuery
  = | { type: "source.list" }
    | { type: "source.get", input: { sourceId: string } }
    | { type: "collection.list" }
    | { type: "collection.get", input: { collectionId: string } }
    | { type: "collection.listInstances", input: { collectionId: string } }
    | { type: "instance.list" }
    | { type: "instance.get", input: { instanceId: string } }
    | { type: "board.getContext" }
    | { type: "board.getConfiguration", input: { collectionId: string } }
    | { type: "nowLayer.getLiveCards" }

export interface ApplicationQueryContext {
  currentBoardId?: string
  sources?: readonly SourceDescriptor[]
}

export interface ApplicationBoardContext {
  boardId: string
  boardName: string
  collectionId: string
}

export interface ApplicationNowLayerLiveCard {
  collectionId: string
  collectionIds: string[]
  instanceId: string
  sourceId: string
}

export interface BoardConfigurationResult {
  defaultLayer: Collection["defaultLayer"]
  nowLayer: Collection["nowLayer"]
}

export interface CollectionDetail {
  collection: Collection
  instances: Instance[]
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
            ? Instance[]
            : Query extends { type: "instance.list" }
              ? Instance[]
              : Query extends { type: "instance.get" }
                ? Instance
                : Query extends { type: "board.getContext" }
                  ? ApplicationBoardContext
                  : Query extends { type: "board.getConfiguration" }
                    ? BoardConfigurationResult
                    : Query extends { type: "nowLayer.getLiveCards" }
                      ? ApplicationNowLayerLiveCard[]
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
      return {
        collection,
        instances: resolveCollectionInstances(data, collection),
      } as ApplicationQueryResult<Query>
    }
    case "collection.listInstances":
      return resolveCollectionInstances(
        data,
        getCollection(data, query.input.collectionId),
      ) as ApplicationQueryResult<Query>
    case "instance.list":
      return data.instances as ApplicationQueryResult<Query>
    case "instance.get": {
      const instance = data.instances.find(candidate => candidate.instanceId === query.input.instanceId)
      if (!instance) throw new Error(`Instance '${query.input.instanceId}' not found`)
      return instance as ApplicationQueryResult<Query>
    }
    case "board.getContext":
      return resolveBoardContext(data, context) as ApplicationQueryResult<Query>
    case "board.getConfiguration": {
      const { defaultLayer, nowLayer } = getCollection(data, query.input.collectionId)
      return { defaultLayer, nowLayer } as ApplicationQueryResult<Query>
    }
    case "nowLayer.getLiveCards": {
      const board = resolveBoardContext(data, context)
      const collection = getCollection(data, board.collectionId)
      const collectionIdsByInstance = indexCollectionIdsByInstance(data.collections)
      return resolveCollectionInstances(data, collection).map(instance => ({
        collectionId: collection.id,
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

function resolveBoardContext(
  data: ApplicationData,
  context: ApplicationQueryContext | undefined,
): ApplicationBoardContext {
  const collection = data.collections.find(candidate => candidate.id === context?.currentBoardId)
    ?? data.collections[0]
  if (!collection) throw new Error("NewsNext has no Boards")
  return { boardId: collection.id, boardName: collection.name, collectionId: collection.id }
}

function getCollection(data: ApplicationData, collectionId: string): Collection {
  const collection = data.collections.find(candidate => candidate.id === collectionId)
  if (!collection) throw new Error(`Collection '${collectionId}' not found`)
  return collection
}

function resolveCollectionInstances(
  data: ApplicationData,
  collection: Collection,
): Instance[] {
  const instances = new Map(data.instances.map(instance => [instance.instanceId, instance]))
  return collection.instanceIds.flatMap((instanceId) => {
    const instance = instances.get(instanceId)
    return instance ? [instance] : []
  })
}
