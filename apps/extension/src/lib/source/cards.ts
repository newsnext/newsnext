import type {
  SourcePatch,
  SourcePresentationMetadata,
} from "@newsnext/source/types"
import type { BoardSource, SourceDescriptor } from "@/typings/source"
import { SOURCE_PRESENTATION_METADATA_KEYS } from "@newsnext/source"
import { pick } from "es-toolkit"
import { ALL_BOARD_ID } from "@/lib/board"
import { createId } from "@/lib/id"

export interface SourceInstance {
  instanceId: string
  sourceId: string
  boardId: string | null
  patch: SourceInstancePatch
  createdAt: number
}

export interface SourceCards {
  ids: string[]
  map: Record<string, BoardSource>
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
  source: BoardSource,
  instance: SourceInstance,
): BoardSource {
  const metadata = pick(instance.patch.metadata ?? {}, SOURCE_PRESENTATION_METADATA_KEYS)

  return {
    ...source,
    metadata: {
      ...source.metadata,
      ...metadata,
    },
    createdAt: instance.createdAt,
    paramsValue: instance.patch.params,
  }
}

export function createBoardSource(
  source: SourceDescriptor,
  instance: SourceInstance,
): BoardSource {
  return applyInstanceOverrides({
    ...source,
    id: instance.instanceId,
    sourceId: instance.sourceId,
    boardId: instance.boardId,
  }, instance)
}

export function createSourceInstance(
  sourceId: string,
  boardId: string | null,
  patch: SourceInstancePatch,
): SourceInstance {
  return {
    instanceId: `${sourceId}::${createId()}`,
    sourceId,
    boardId,
    patch,
    createdAt: Date.now(),
  }
}

function buildCardSources(
  sources: SourceDescriptor[],
  sourceInstances: SourceInstance[],
): BoardSource[] {
  const sourceIds = new Set(sources.map(source => source.id))
  const instanceGroups = new Map<string, SourceInstance[]>()

  sourceInstances.forEach((instance) => {
    if (!sourceIds.has(instance.sourceId)) {
      return
    }

    const currentInstances = instanceGroups.get(instance.sourceId) ?? []
    currentInstances.push(instance)
    instanceGroups.set(instance.sourceId, currentInstances)
  })

  return sources.flatMap(source =>
    (instanceGroups.get(source.id) ?? [])
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(instance => createBoardSource(source, instance)),
  )
}

export function buildSourceCards({
  sources,
  sourceInstances,
  boardId,
}: {
  sources: SourceDescriptor[]
  sourceInstances: SourceInstance[]
  boardId: string
}): SourceCards {
  const visibleInstances = boardId === ALL_BOARD_ID
    ? sourceInstances
    : sourceInstances.filter(instance => instance.boardId === boardId)
  const cards = buildCardSources(sources, visibleInstances)

  return {
    ids: cards.map(source => source.id),
    map: Object.fromEntries(cards.map(source => [source.id, source])),
  }
}

export function getSourceCard(cards: SourceCards, id: string): BoardSource {
  const source = cards.map[id]
  if (!source) {
    throw new Error(`Missing source card: ${id}`)
  }
  return source
}

export function applySourceLoaderMetadata(
  source: BoardSource,
  metadata: SourcePresentationMetadata | undefined,
): BoardSource {
  if (!metadata) {
    return source
  }

  return {
    ...source,
    metadata: {
      ...source.metadata,
      ...metadata,
    },
  }
}
