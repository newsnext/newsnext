import type { SourceDescriptor } from "@newsnext/source-kit/types"
import type { Collection } from "../collection"
import type { Instance } from "../source/live-cards"
import type { ApplicationData } from "./data"
import { indexCollectionIdsByInstance } from "../collection"

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

export function listSourcesQuery(sources: readonly SourceDescriptor[]): SourceDescriptor[] {
  return [...sources]
}

export function getSourceQuery(
  sources: readonly SourceDescriptor[],
  input: { sourceId: string },
): SourceDescriptor {
  const source = sources.find(candidate => candidate.id === input.sourceId)
  if (!source) throw new Error(`Source '${input.sourceId}' not found`)
  return source
}

export function listCollectionsQuery(data: ApplicationData): Collection[] {
  return data.collections
}

export function getCollectionQuery(
  data: ApplicationData,
  input: { collectionId: string },
): CollectionDetail {
  const collection = getCollection(data, input.collectionId)
  return { collection, instances: resolveCollectionInstances(data, collection) }
}

export function listCollectionInstancesQuery(
  data: ApplicationData,
  input: { collectionId: string },
): Instance[] {
  return resolveCollectionInstances(data, getCollection(data, input.collectionId))
}

export function listInstancesQuery(data: ApplicationData): Instance[] {
  return data.instances
}

export function getInstanceQuery(
  data: ApplicationData,
  input: { instanceId: string },
): Instance {
  const instance = data.instances.find(candidate => candidate.instanceId === input.instanceId)
  if (!instance) throw new Error(`Instance '${input.instanceId}' not found`)
  return instance
}

export function getBoardContextQuery(
  data: ApplicationData,
  currentBoardId?: string,
): ApplicationBoardContext {
  return resolveBoardContext(data, currentBoardId)
}

export function getBoardConfigurationQuery(
  data: ApplicationData,
  input: { collectionId: string },
): BoardConfigurationResult {
  const { defaultLayer, nowLayer } = getCollection(data, input.collectionId)
  return { defaultLayer, nowLayer }
}

export function getNowLayerLiveCardsQuery(
  data: ApplicationData,
  currentBoardId?: string,
): ApplicationNowLayerLiveCard[] {
  const board = resolveBoardContext(data, currentBoardId)
  const collection = getCollection(data, board.collectionId)
  const collectionIdsByInstance = indexCollectionIdsByInstance(data.collections)
  return resolveCollectionInstances(data, collection).map(instance => ({
    collectionId: collection.id,
    collectionIds: collectionIdsByInstance.get(instance.instanceId) ?? [],
    instanceId: instance.instanceId,
    sourceId: instance.sourceId,
  }))
}

function resolveBoardContext(
  data: ApplicationData,
  currentBoardId?: string,
): ApplicationBoardContext {
  const collection = data.collections.find(candidate => candidate.id === currentBoardId)
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
