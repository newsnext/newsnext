import type { BoardType } from "@newsnext/shared/types"
import type { BoardSource, SourceDescriptor } from "@/typings/source"
import { stableStringify } from "@newsnext/shared/utils"

export interface SourceInstance {
  instanceId: string
  sourceKey: string
  params: Record<string, unknown>
  isFork: boolean
  createdAt: number
}

type BoardSourceSource = Omit<SourceDescriptor, "params"> & {
  params?: Record<string, unknown>
}

function createBoardSource(source: BoardSourceSource): BoardSource {
  const sourceId = source.provider ? `${source.provider}:${source.id}` : source.id
  return {
    ...source,
    params: source.params as BoardSource["params"],
    id: sourceId,
    sourceId,
    variantId: source.id,
    isFork: false,
  }
}

export function createForkedInstance(
  sourceKey: string,
  params: Record<string, unknown> = {},
): SourceInstance {
  return {
    instanceId: `${sourceKey}::${crypto.randomUUID()}`,
    sourceKey,
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
    if (!instance.isFork || !baseSourceMap[instance.sourceKey]) {
      return
    }

    const currentForks = forkGroups.get(instance.sourceKey) ?? []
    currentForks.push(instance)
    forkGroups.set(instance.sourceKey, currentForks)
  })

  const mergedSources = baseSources.flatMap((source) => {
    const forks = (forkGroups.get(source.sourceId) ?? [])
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(instance => ({
        ...source,
        id: instance.instanceId,
        sourceId: instance.sourceKey,
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
