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
  boardId: string | null = null,
): LiveCardViewModel {
  return applyInstanceOverrides({
    ...source,
    id: instance.instanceId,
    sourceId: instance.sourceId,
    boardId,
  }, instance)
}

export function buildLiveCards({
  sources,
  instances,
  boardId,
  boardInstanceIds,
}: {
  sources: SourceDescriptor[]
  instances: Instance[]
  boardId: string | null
  boardInstanceIds?: readonly string[]
}): LiveCardViewModel[] {
  const instanceGroups = new Map<string, Instance[]>()
  const visibleIds = boardInstanceIds ? new Set(boardInstanceIds) : undefined

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
      .map(instance => createLiveCard(source, instance, boardId)),
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
