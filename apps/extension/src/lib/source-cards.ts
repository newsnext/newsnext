import type { BoardType } from "@newsnext/shared/types"
import type {
  SourcePatch,
  SourcePresentationMetadata,
} from "@newsnext/source/types"
import type { BoardSource, SourceDescriptor } from "@/typings/source"
import { SOURCE_PRESENTATION_METADATA_KEYS } from "@newsnext/source"
import { pick } from "es-toolkit"

export interface SourceInstance {
  instanceId: string
  sourceId: string
  patch: SourceInstancePatch
  originRef?: SourceInstanceOriginRef
  createdAt: number
  updatedAt: number
}

export type SourceInstanceOriginRef
  = | { type: "radar", ruleId: string }
    | { type: "fork", forkedFromInstanceId: string }

export type SourceInstanceMetadata = Partial<SourcePresentationMetadata>

export type SourceInstancePatch = SourcePatch<
  Record<string, unknown>,
  SourceInstanceMetadata
>

export function createSourceInstancePatch(
  source: BoardSource,
  params: Record<string, unknown>,
): SourceInstancePatch {
  return source.isCustom
    ? {
        params,
        metadata: pick(source, SOURCE_PRESENTATION_METADATA_KEYS),
      }
    : { params }
}

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

function createForkInstanceId(sourceId: string): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  const id = Array.from(bytes, byte => byte.toString(36).padStart(2, "0")).join("")
  return `${sourceId}::fork_${id}`
}

type BoardSourceSource = Omit<SourceDescriptor, "params"> & {
  params?: Record<string, unknown>
}

function createBoardSource(source: BoardSourceSource, isLocalOnly: boolean): BoardSource {
  return {
    ...source,
    params: source.params as BoardSource["params"],
    id: source.id,
    sourceId: source.id,
    isCustom: false,
    isLocalOnly,
  }
}

function applyInstanceOverrides(
  source: BoardSource,
  instance: SourceInstance,
): BoardSource {
  const metadata = pick(instance.patch.metadata ?? {}, SOURCE_PRESENTATION_METADATA_KEYS)

  return {
    ...source,
    ...metadata,
    paramsValue: instance.patch.params,
  }
}

export function createForkedInstance(
  sourceId: string,
  patch: SourceInstancePatch,
  originRef?: SourceInstanceOriginRef,
): SourceInstance {
  const now = Date.now()

  return {
    instanceId: createForkInstanceId(sourceId),
    sourceId,
    patch,
    originRef,
    createdAt: now,
    updatedAt: now,
  }
}

function buildForkedBoardSources(
  sources: BoardSourceSource[],
  sourceInstances: SourceInstance[],
  isLocalOnly: boolean,
): BoardSource[] {
  const baseSources = sources.map(source => createBoardSource(source, isLocalOnly))
  const baseSourceIds = new Set(baseSources.map(source => source.sourceId))
  const customGroups = new Map<string, SourceInstance[]>()

  sourceInstances.forEach((instance) => {
    if (!baseSourceIds.has(instance.sourceId)) {
      return
    }

    const currentCustomSources = customGroups.get(instance.sourceId) ?? []
    currentCustomSources.push(instance)
    customGroups.set(instance.sourceId, currentCustomSources)
  })

  return baseSources.flatMap(source =>
    (customGroups.get(source.sourceId) ?? [])
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(instance => applyInstanceOverrides({
        ...source,
        id: instance.instanceId,
        sourceId: instance.sourceId,
        isCustom: true,
      }, instance)),
  )
}

export function buildBoardSources({
  sources,
  boardId,
  starredSourceInstanceIds,
  sourceInstances,
  isLocalOnly = false,
}: {
  sources: BoardSourceSource[]
  boardId: BoardType
  starredSourceInstanceIds: string[]
  sourceInstances: SourceInstance[]
  isLocalOnly?: boolean
}): { ids: string[], map: Record<string, BoardSource> } {
  const forkedSources = buildForkedBoardSources(sources, sourceInstances, isLocalOnly)
  const visibleSources = boardId === "stars"
    ? forkedSources.filter(source => starredSourceInstanceIds.includes(source.id))
    : forkedSources

  return {
    ids: visibleSources.map(source => source.id),
    map: Object.fromEntries(visibleSources.map(source => [source.id, source])),
  }
}
