import type { BoardType } from "@newsnext/shared/types"
import type { BoardFeed, FeedDescriptor } from "@/typings/feed"
import { hashString, stableStringify } from "@newsnext/shared/utils"

export interface FeedInstance {
  instanceId: string
  feedKey: string
  params: Record<string, unknown>
  isFork: boolean
  createdAt: number
}

type BoardFeedSource = Omit<FeedDescriptor, "params"> & {
  params?: Record<string, unknown>
}

function createBoardFeed(feed: BoardFeedSource): BoardFeed {
  const feedId = feed.provider ? `${feed.provider}:${feed.id}` : feed.id
  return {
    ...feed,
    params: feed.params as BoardFeed["params"],
    id: feedId,
    feedId,
    variantId: feed.id,
    isFork: false,
  }
}

export function createFeedInstance(
  feedKey: string,
  params: Record<string, unknown> = {},
  isFork = false,
): FeedInstance {
  const paramsKey = stableStringify(params)

  return {
    instanceId: isFork ? `${feedKey}::fork:${hashString(paramsKey)}` : feedKey,
    feedKey,
    params,
    isFork,
    createdAt: Date.now(),
  }
}

export function buildBoardFeeds({
  feeds,
  boardId,
  starredFeedInstanceIds,
  feedInstances,
}: {
  feeds: BoardFeedSource[]
  boardId: BoardType
  starredFeedInstanceIds: string[]
  feedInstances: FeedInstance[]
}): { ids: string[], map: Record<string, BoardFeed> } {
  const instanceMap = new Map(feedInstances.map(instance => [instance.instanceId, instance]))
  const baseFeeds = feeds.map((feed) => {
    const boardFeed = createBoardFeed(feed)
    const instance = instanceMap.get(boardFeed.id)
    return instance
      ? { ...boardFeed, paramsValue: instance.params }
      : boardFeed
  })
  const baseFeedMap = Object.fromEntries(baseFeeds.map(feed => [feed.feedId, feed]))
  const forkGroups = new Map<string, FeedInstance[]>()

  feedInstances.forEach((instance) => {
    if (!instance.isFork || !baseFeedMap[instance.feedKey]) {
      return
    }

    const currentForks = forkGroups.get(instance.feedKey) ?? []
    currentForks.push(instance)
    forkGroups.set(instance.feedKey, currentForks)
  })

  const mergedFeeds = baseFeeds.flatMap((feed) => {
    const forks = (forkGroups.get(feed.feedId) ?? [])
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(instance => ({
        ...feed,
        id: instance.instanceId,
        feedId: instance.feedKey,
        paramsValue: instance.params,
        isFork: true,
      } satisfies BoardFeed))

    return {
      baseFeed: feed,
      forkedFeeds: forks,
    }
  })

  const visibleFeeds = boardId === "stars"
    ? mergedFeeds.flatMap(({ baseFeed, forkedFeeds }) => [baseFeed, ...forkedFeeds]).filter(feed => starredFeedInstanceIds.includes(feed.id))
    : boardId === "forks"
      ? mergedFeeds.flatMap(({ forkedFeeds }) => forkedFeeds)
      : mergedFeeds.map(({ baseFeed }) => baseFeed)

  return {
    ids: visibleFeeds.map(feed => feed.id),
    map: Object.fromEntries(visibleFeeds.map(feed => [feed.id, feed])),
  }
}

export function buildFeedRequestKey(feedId: string, params: Record<string, unknown> = {}): string {
  return `${feedId}:${stableStringify(params)}`
}
