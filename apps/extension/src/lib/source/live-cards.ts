import type {
  SourcePatch,
  SourcePresentationMetadata,
} from "@newsnext/source/types"
import type { LiveCardViewModel, SourceDescriptor } from "@/typings/source"
import { SOURCE_PRESENTATION_METADATA_KEYS } from "@newsnext/source"
import { pick } from "es-toolkit"

export interface SourceInstance {
  instanceId: string
  sourceId: string
  patch: SourceInstancePatch
  createdAt: number
}

export type SourceInstanceMetadata = SourcePresentationMetadata

export type SourceInstancePatch = SourcePatch<
  Record<string, unknown>,
  SourceInstanceMetadata
>

export function mergeSourceInstancePatch(
  current: SourceInstancePatch | undefined,
  patch: SourceInstancePatch,
): SourceInstancePatch {
  return {
    params: current?.params || patch.params
      ? { ...current?.params, ...patch.params }
      : undefined,
    metadata: current?.metadata || patch.metadata
      ? { ...current?.metadata, ...patch.metadata }
      : undefined,
  }
}

function applyInstanceOverrides(
  liveCard: LiveCardViewModel,
  instance: SourceInstance,
): LiveCardViewModel {
  const metadata = pick(instance.patch.metadata ?? {}, SOURCE_PRESENTATION_METADATA_KEYS)

  return {
    ...liveCard,
    metadata: {
      ...liveCard.metadata,
      ...metadata,
    },
    createdAt: instance.createdAt,
    paramsValue: instance.patch.params,
  }
}

export function createLiveCard(
  source: SourceDescriptor,
  instance: SourceInstance,
  collectionId: string | null = null,
): LiveCardViewModel {
  return applyInstanceOverrides({
    ...source,
    id: instance.instanceId,
    sourceId: instance.sourceId,
    collectionId,
  }, instance)
}

export function buildLiveCards({
  sources,
  sourceInstances,
  collectionId,
  collectionInstanceIds,
}: {
  sources: SourceDescriptor[]
  sourceInstances: SourceInstance[]
  collectionId: string | null
  collectionInstanceIds?: readonly string[]
}): LiveCardViewModel[] {
  const instanceGroups = new Map<string, SourceInstance[]>()
  const visibleIds = collectionInstanceIds ? new Set(collectionInstanceIds) : undefined

  sourceInstances.forEach((instance) => {
    if (visibleIds && !visibleIds.has(instance.instanceId)) {
      return
    }

    const currentInstances = instanceGroups.get(instance.sourceId) ?? []
    currentInstances.push(instance)
    instanceGroups.set(instance.sourceId, currentInstances)
  })

  return sources.flatMap(source =>
    (instanceGroups.get(source.id) ?? [])
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(instance => createLiveCard(source, instance, collectionId)),
  )
}

export function applySourceLoaderMetadata(
  liveCard: LiveCardViewModel,
  metadata: SourcePresentationMetadata | undefined,
): LiveCardViewModel {
  if (!metadata) {
    return liveCard
  }

  return {
    ...liveCard,
    metadata: {
      ...liveCard.metadata,
      ...metadata,
    },
  }
}
