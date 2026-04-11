import type { BoardType } from "@newsnext/shared/types"
import type { BoardFeed, FeedDescriptor } from "@/typings/feed"

export interface ForkedFeedCard {
  id: string
  feedId: string
  createdAt: number
}

function createBoardFeed(feed: FeedDescriptor): BoardFeed {
  const feedId = feed.provider ? `${feed.provider}:${feed.id}` : feed.id
  return {
    ...feed,
    id: feedId,
    feedId,
    variantId: feed.id,
    isFork: false,
  }
}

export function createForkedFeedCard(feedId: string): ForkedFeedCard {
  return {
    id: `${feedId}::fork:${crypto.randomUUID()}`,
    feedId,
    createdAt: Date.now(),
  }
}

export function buildBoardFeeds({
  feeds,
  boardId,
  starredCardIds,
  forkedFeedCards,
}: {
  feeds: FeedDescriptor[]
  boardId: BoardType
  starredCardIds: string[]
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
        isFork: true,
      } satisfies BoardFeed))

    return [feed, ...forks]
  })

  const visibleFeeds = boardId === "stars"
    ? mergedFeeds.filter(feed => starredCardIds.includes(feed.id))
    : mergedFeeds

  return {
    ids: visibleFeeds.map(feed => feed.id),
    map: Object.fromEntries(visibleFeeds.map(feed => [feed.id, feed])),
  }
}

export function buildFeedRequestKey(feedId: string, params: Record<string, unknown> = {}): string {
  return `${feedId}:${JSON.stringify(params)}`
}
