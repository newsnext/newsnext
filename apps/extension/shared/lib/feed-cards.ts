import type { BoardType } from "@newsnext/shared/types"
import type { BoardFeed, FeedDescriptor } from "@/typings/feed"
import { hashString, stableStringify } from "@newsnext/shared/utils"

export interface ForkedFeedCard {
  id: string
  feedId: string
  params?: Record<string, unknown>
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

export function createForkedFeedCard(feedId: string, params: Record<string, unknown> = {}): ForkedFeedCard {
  const paramsKey = stableStringify(params)

  return {
    id: `${feedId}::fork:${hashString(paramsKey)}`,
    feedId,
    params,
    createdAt: Date.now(),
  }
}

export function buildBoardFeeds({
  feeds,
  boardId,
  starredFeedIds,
  forkedFeedCards,
}: {
  feeds: BoardFeedSource[]
  boardId: BoardType
  starredFeedIds: string[]
  forkedFeedCards: ForkedFeedCard[]
}): { ids: string[], map: Record<string, BoardFeed> } {
  const baseFeeds = feeds.map(createBoardFeed)
  const baseFeedMap = Object.fromEntries(baseFeeds.map(feed => [feed.feedId, feed]))
  const forkGroups = new Map<string, ForkedFeedCard[]>()

  forkedFeedCards.forEach((forkedFeedCard) => {
    if (!baseFeedMap[forkedFeedCard.feedId]) {
      return
    }

    const currentForks = forkGroups.get(forkedFeedCard.feedId) ?? []
    currentForks.push(forkedFeedCard)
    forkGroups.set(forkedFeedCard.feedId, currentForks)
  })

  const mergedFeeds = baseFeeds.flatMap((feed) => {
    const forks = (forkGroups.get(feed.feedId) ?? [])
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(forkedFeedCard => ({
        ...feed,
        id: forkedFeedCard.id,
        feedId: forkedFeedCard.feedId,
        paramsValue: forkedFeedCard.params,
        isFork: true,
      } satisfies BoardFeed))

    return {
      baseFeed: feed,
      forkedFeeds: forks,
    }
  })

  const visibleFeeds = boardId === "stars"
    ? mergedFeeds.flatMap(({ baseFeed, forkedFeeds }) => [baseFeed, ...forkedFeeds]).filter(feed => starredFeedIds.includes(feed.id))
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
