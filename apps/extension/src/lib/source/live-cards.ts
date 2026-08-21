import type {
  SourcePatch,
  SourcePresentationMetadata,
} from "@newsnext/source-kit/types"
import type { LiveCardViewModel, SourceDescriptor } from "@/typings/source"
import { SOURCE_PRESENTATION_METADATA_KEYS } from "@newsnext/source-kit"
import { pick } from "es-toolkit"
import { mergeSourceParamValues } from "./params"

export interface Instance {
  instanceId: string
  sourceId: string
  patch: InstancePatch
  createdAt: number
}

export type InstanceMetadata = SourcePresentationMetadata

export type InstancePatch = SourcePatch<
  Record<string, unknown>,
  InstanceMetadata
>

export function mergeInstancePatch(
  current: InstancePatch | undefined,
  patch: InstancePatch,
): InstancePatch {
  return {
    params: current?.params || patch.params
      ? mergeSourceParamValues(current?.params, patch.params)
      : undefined,
    metadata: current?.metadata || patch.metadata
      ? { ...current?.metadata, ...patch.metadata }
      : undefined,
  }
}

function applyInstanceOverrides(
  liveCard: LiveCardViewModel,
  instance: Instance,
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
  instance: Instance,
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
  instances,
  collectionId,
  collectionInstanceIds,
}: {
  sources: SourceDescriptor[]
  instances: Instance[]
  collectionId: string | null
  collectionInstanceIds?: readonly string[]
}): LiveCardViewModel[] {
  const instanceGroups = new Map<string, Instance[]>()
  const visibleIds = collectionInstanceIds ? new Set(collectionInstanceIds) : undefined

  instances.forEach((instance) => {
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
