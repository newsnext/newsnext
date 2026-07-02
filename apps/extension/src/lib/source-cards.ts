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

export const FEATURED_SOURCE_IDS: string[] = [
  // "aihot:all",
  // "bilibili:hotword",
  // "bilibili:following-videos",
  // "bilibili:ranking",
  "browser:history",
  // "browser:bookmarks",
  // "cls:telegraph",
  // "cls:depth",
  // "cls:hot-article",
  "folo:feed",
  "folo:list",
  // "github:trending",
  // "hackernews:top",
  // "hackernews:newest",
  // "hackernews:show",
  // "hackernews:ask",
  "jike:following-updates",
  // "jike:user-updates",
  // "jike:topic-recent",
  // "jike:topic-hottest",
  "linuxdo:latest",
  "linuxdo:top-daily",
  // "netease-music:playlist",
  // "newsnow:topic-latest",
  // "tieba:hot-topic",
  // "v2ex:feed",
  // "weibo:hot-search",
  "x:place-trends",
  "x:recommended",
  // "x:following",
  // "x:user",
  // "xueqiu:hot-stock",
  // "zaobao:realtime",
  // "zhihu:hot-list",
]

function isBoardSource(source: BoardSource | undefined): source is BoardSource {
  return Boolean(source)
}

function createBoardSource(source: BoardSourceSource, isLocalOnly: boolean): BoardSource {
  return {
    ...source,
    params: source.params as BoardSource["params"],
    id: source.id,
    sourceId: source.id,
    isFork: false,
    isLocalOnly,
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
  isLocalOnly = false,
}: {
  sources: BoardSourceSource[]
  boardId: BoardType
  starredSourceInstanceIds: string[]
  sourceInstances: SourceInstance[]
  isLocalOnly?: boolean
}): { ids: string[], map: Record<string, BoardSource> } {
  const instanceMap = new Map(sourceInstances.map(instance => [instance.instanceId, instance]))
  const baseSources = sources.map((source) => {
    const boardSource = createBoardSource(source, isLocalOnly)
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

  const featuredSourceMap = new Map(mergedSources.map(source => [source.baseSource.sourceId, source.baseSource]))
  const featuredSources = FEATURED_SOURCE_IDS
    .map(sourceId => featuredSourceMap.get(sourceId))
    .filter(isBoardSource)

  const visibleSources = boardId === "stars"
    ? mergedSources.flatMap(({ baseSource, forkedSources }) => [baseSource, ...forkedSources].filter(source => starredSourceInstanceIds.includes(source.id)))
    : boardId === "forks"
      ? mergedSources.flatMap(({ forkedSources }) => forkedSources)
      : featuredSources

  return {
    ids: visibleSources.map(source => source.id),
    map: Object.fromEntries(visibleSources.map(source => [source.id, source])),
  }
}

export function buildSourceRequestKey(sourceId: string, params: Record<string, unknown> = {}): string {
  return `${sourceId}:${stableStringify(params)}`
}
