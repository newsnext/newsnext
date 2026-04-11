import type { RefObject } from "react"
import type { BoardFeed, FeedDescriptor } from "@/typings/feed"
import { useAtomValue } from "jotai"
import { useEffect, useState } from "react"
import { isMobile } from "react-device-detect"
import { trpc } from "@/lib/trpc"
import { starredFeedIdsAtom } from "@/store/board"
import { DesktopBoard } from "./desktop-board"
import { MobileBoard } from "./mobile-board"

interface CardBoardProps {
  boardId?: "recommend" | "stars"
  onFeedIdsChange?: (feedIds: string[]) => void
  className?: string
  isScattered?: boolean
  containerRef?: RefObject<HTMLDivElement | null>
}

function processFeeds(feeds: FeedDescriptor[]) {
  // Construct unique IDs using provider:feed format
  const processedFeeds = feeds.map((feed) => {
    const uniqueId = feed.provider ? `${feed.provider}:${feed.id}` : feed.id
    return {
      ...feed,
      variantId: feed.id,
      id: uniqueId,
    } satisfies BoardFeed
  })

  // Use Set to ensure IDs are unique
  const ids = [...new Set(processedFeeds.map(feed => feed.id))]
  const map: Record<string, BoardFeed> = {}

  processedFeeds.forEach((feed) => {
    map[feed.id] = feed
  })

  return { ids, map }
}

export function CardBoard({
  boardId = "recommend",
  onFeedIdsChange,
  className,
  isScattered,
  containerRef,
}: CardBoardProps) {
  const [feedIds, setFeedIds] = useState<string[]>([])
  const [feedsMap, setFeedsMap] = useState<Record<string, BoardFeed>>({})
  const starredFeedIds = useAtomValue(starredFeedIdsAtom)

  const { data: feeds, isPending } = trpc.getBoard.useQuery(
    { boardId, starredFeedIds },
  )

  const [prevBoardId, setPrevBoardId] = useState(boardId)
  if (prevBoardId !== boardId) {
    setPrevBoardId(boardId)
    setFeedIds([])
    setFeedsMap({})
  }

  useEffect(() => {
    if (feeds) {
      const { ids, map } = processFeeds(feeds)
      setFeedIds(ids)
      setFeedsMap(map)
    }
  }, [feeds, boardId])

  const handleFeedIdsChange = (newFeedIds: string[]) => {
    setFeedIds(newFeedIds)
    onFeedIdsChange?.(newFeedIds)
  }

  if (!isPending && boardId === "stars" && feedIds.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-6 text-center text-sm text-muted-foreground">
        Star cards from any board to collect them here.
      </div>
    )
  }

  if (isMobile) {
    return (
      <MobileBoard
        key={boardId}
        feedIds={feedIds}
        feedsMap={feedsMap}
        className={className}
        isScattered={isScattered}
      />
    )
  }

  return (
    <DesktopBoard
      key={boardId}
      feedIds={feedIds}
      feedsMap={feedsMap}
      className={className}
      isScattered={isScattered}
      containerRef={containerRef}
      onFeedIdsChange={handleFeedIdsChange}
    />
  )
}
