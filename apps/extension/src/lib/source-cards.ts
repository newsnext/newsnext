import type {
  SourcePatch,
  SourcePresentationMetadata,
} from "@newsnext/source/types"
import type { BoardSource, SourceDescriptor } from "@/typings/source"
import { SOURCE_PRESENTATION_METADATA_KEYS } from "@newsnext/source"
import { pick } from "es-toolkit"
import { ALL_BOARD_ID } from "@/lib/boards"

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

function createCardInstanceId(sourceId: string): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  const id = Array.from(bytes, byte => byte.toString(36).padStart(2, "0")).join("")
  return `${sourceId}::card_${id}`
}

function createBoardSource(source: SourceDescriptor): BoardSource {
  return {
    ...source,
    id: source.id,
    sourceId: source.id,
    boardId: null,
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

export function createCardInstance(
  sourceId: string,
  boardId: string | null,
  patch: SourceInstancePatch,
): SourceInstance {
  const now = Date.now()

  return {
    instanceId: createCardInstanceId(sourceId),
    sourceId,
    boardId,
    patch,
    createdAt: now,
  }
}

function buildCardSources(
  sources: SourceDescriptor[],
  sourceInstances: SourceInstance[],
): BoardSource[] {
  const baseSources = sources.map(createBoardSource)
  const baseSourceIds = new Set(baseSources.map(source => source.sourceId))
  const instanceGroups = new Map<string, SourceInstance[]>()

  sourceInstances.forEach((instance) => {
    if (!baseSourceIds.has(instance.sourceId)) {
      return
    }

    const currentInstances = instanceGroups.get(instance.sourceId) ?? []
    currentInstances.push(instance)
    instanceGroups.set(instance.sourceId, currentInstances)
  })

  return baseSources.flatMap(source =>
    (instanceGroups.get(source.sourceId) ?? [])
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(instance => applyInstanceOverrides({
        ...source,
        id: instance.instanceId,
        sourceId: instance.sourceId,
        boardId: instance.boardId,
      }, instance)),
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
