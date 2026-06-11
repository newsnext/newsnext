import type { BoardType } from "@newsnext/shared/types"
import type { BoardSource, SourceDescriptor } from "@/typings/source"
import { stableStringify } from "@newsnext/shared/utils"

export interface SourceInstance {
  instanceId: string
  sourceId: string
  params: Record<string, unknown>
  isFork: boolean
  createdAt: number
}

type BoardSourceSource = Omit<SourceDescriptor, "params"> & {
  params?: Record<string, unknown>
}

function createBoardSource(source: BoardSourceSource): BoardSource {
  const sourceId = source.provider ? `${source.provider}:${source.key}` : source.key
  return {
    ...source,
    params: source.params as BoardSource["params"],
    id: sourceId,
    sourceId,
    variantId: source.key,
    isFork: false,
  }
}

export function createForkedInstance(
  sourceId: string,
  params: Record<string, unknown> = {},
): SourceInstance {
  return {
    instanceId: `${sourceId}::${crypto.randomUUID()}`,
    sourceId,
    params,
    isFork: true,
    createdAt: Date.now(),
  }
}

export function buildBoardSources({
  sources,
  boardId,
  starredSourceInstanceIds,
  sourceInstances,
}: {
  sources: BoardSourceSource[]
  boardId: BoardType
  starredSourceInstanceIds: string[]
  sourceInstances: SourceInstance[]
}): { ids: string[], map: Record<string, BoardSource> } {
  const instanceMap = new Map(sourceInstances.map(instance => [instance.instanceId, instance]))
  const baseSources = sources.map((source) => {
    const boardSource = createBoardSource(source)
    const instance = instanceMap.get(boardSource.id)
    return instance
      ? { ...boardSource, paramsValue: instance.params }
      : boardSource
  })
  const baseSourceMap = Object.fromEntries(baseSources.map(source => [source.sourceId, source]))
  const forkGroups = new Map<string, SourceInstance[]>()

  sourceInstances.forEach((instance) => {
    if (!instance.isFork || !baseSourceMap[instance.sourceId]) {
      return
    }

    const currentForks = forkGroups.get(instance.sourceId) ?? []
    currentForks.push(instance)
    forkGroups.set(instance.sourceId, currentForks)
  })

  const mergedSources = baseSources.flatMap((source) => {
    const forks = (forkGroups.get(source.sourceId) ?? [])
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(instance => ({
        ...source,
        id: instance.instanceId,
        sourceId: instance.sourceId,
        paramsValue: instance.params,
        isFork: true,
      } satisfies BoardSource))

    return {
      baseSource: source,
      forkedSources: forks,
    }
  })

  const visibleSources = boardId === "stars"
    ? mergedSources.flatMap(({ baseSource, forkedSources }) => [baseSource, ...forkedSources].filter(source => starredSourceInstanceIds.includes(source.id)))
    : boardId === "forks"
      ? mergedSources.flatMap(({ forkedSources }) => forkedSources)
      : mergedSources.map(({ baseSource }) => baseSource)

  return {
    ids: visibleSources.map(source => source.id),
    map: Object.fromEntries(visibleSources.map(source => [source.id, source])),
  }
}

export function buildSourceRequestKey(sourceId: string, params: Record<string, unknown> = {}): string {
  return `${sourceId}:${stableStringify(params)}`
}
