import type { BoardType } from "@newsnext/shared/types"
import type { BoardSource, SourceDescriptor } from "@/typings/source"

export type SourceInstanceOrigin = "default" | "fork"

export interface SourceInstance {
  instanceId: string
  sourceId: string
  paramsPatch: Record<string, unknown>
  metaPatch?: SourceInstanceMeta
  origin: SourceInstanceOrigin
  originRef?: unknown
  createdAt: number
  updatedAt: number
}

export interface SourceInstanceMeta {
  providerTitle?: string
  title?: string
  desc?: string
  home?: string
  color?: BoardSource["color"]
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
    id: getDefaultSourceInstanceId(source.id),
    sourceId: source.id,
    isCustom: false,
    origin: "default",
    isLocalOnly,
  }
}

function applyInstanceOverrides(
  source: BoardSource,
  instance: SourceInstance,
): BoardSource {
  return {
    ...source,
    ...instance.metaPatch,
    paramsValue: instance.paramsPatch,
  }
}

interface MergedBoardSource {
  baseSource: BoardSource
  forkedSources: BoardSource[]
}

export function createForkedInstance(
  sourceId: string,
  paramsPatch: Record<string, unknown> = {},
  metaPatch?: SourceInstanceMeta,
  originRef?: unknown,
): SourceInstance {
  const now = Date.now()

  return {
    instanceId: createForkInstanceId(sourceId),
    sourceId,
    paramsPatch,
    metaPatch,
    origin: "fork",
    originRef,
    createdAt: now,
    updatedAt: now,
  }
}

export function getDefaultSourceInstanceId(sourceId: string): string {
  return `${sourceId}::default`
}

export function createDefaultSourceInstance(sourceId: string): SourceInstance {
  const now = Date.now()

  return {
    instanceId: getDefaultSourceInstanceId(sourceId),
    sourceId,
    paramsPatch: {},
    origin: "default",
    createdAt: now,
    updatedAt: now,
  }
}

function buildMergedBoardSources(
  sources: BoardSourceSource[],
  sourceInstances: SourceInstance[],
  isLocalOnly: boolean,
): MergedBoardSource[] {
  const instanceMap = new Map(sourceInstances.map(instance => [instance.instanceId, instance]))
  const baseSources = sources.map((source) => {
    const boardSource = createBoardSource(source, isLocalOnly)
    const instance = instanceMap.get(boardSource.id)
    return instance
      ? applyInstanceOverrides(boardSource, instance)
      : boardSource
  })
  const baseSourceMap = Object.fromEntries(baseSources.map(source => [source.sourceId, source]))
  const customGroups = new Map<string, SourceInstance[]>()

  sourceInstances.forEach((instance) => {
    if (instance.origin === "default" || !baseSourceMap[instance.sourceId]) {
      return
    }

    const currentCustomSources = customGroups.get(instance.sourceId) ?? []
    currentCustomSources.push(instance)
    customGroups.set(instance.sourceId, currentCustomSources)
  })

  return baseSources.map((source) => {
    const forks = (customGroups.get(source.sourceId) ?? [])
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((instance) => {
        return applyInstanceOverrides({
          ...source,
          id: instance.instanceId,
          sourceId: instance.sourceId,
          isCustom: true,
          origin: instance.origin,
        }, instance)
      })

    return {
      baseSource: source,
      forkedSources: forks,
    }
  })
}

function createBoardSourceResult(visibleSources: BoardSource[]): { ids: string[], map: Record<string, BoardSource> } {
  return {
    ids: visibleSources.map(source => source.id),
    map: Object.fromEntries(visibleSources.map(source => [source.id, source])),
  }
}

export function buildAllBoardSources({
  sources,
  sourceInstances,
  isLocalOnly = false,
}: {
  sources: BoardSourceSource[]
  sourceInstances: SourceInstance[]
  isLocalOnly?: boolean
}): { ids: string[], map: Record<string, BoardSource> } {
  const mergedSources = buildMergedBoardSources(sources, sourceInstances, isLocalOnly)

  return createBoardSourceResult(
    mergedSources.flatMap(({ baseSource, forkedSources }) => [baseSource, ...forkedSources]),
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
  const mergedSources = buildMergedBoardSources(sources, sourceInstances, isLocalOnly)
  const featuredSourceMap = new Map(mergedSources.map(source => [source.baseSource.sourceId, source.baseSource]))
  const featuredSources = FEATURED_SOURCE_IDS
    .map(sourceId => featuredSourceMap.get(sourceId))
    .filter(isBoardSource)

  const visibleSources = boardId === "stars"
    ? mergedSources.flatMap(({ baseSource, forkedSources }) => [baseSource, ...forkedSources].filter(source => starredSourceInstanceIds.includes(source.id)))
    : boardId === "forks"
      ? mergedSources.flatMap(({ forkedSources }) => forkedSources)
      : featuredSources

  return createBoardSourceResult(visibleSources)
}
