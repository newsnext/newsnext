import type { RefObject } from "react"
import type { BoardFeed } from "@/typings/feed"
import { useAtomValue } from "jotai"
import { useEffect, useState } from "react"
import { isMobile } from "react-device-detect"
import { buildBoardFeeds } from "@/lib/feed-cards"
import { trpc } from "@/lib/trpc"
import { feedInstancesAtom, starredFeedInstanceIdsAtom } from "@/store/board"
import { DesktopBoard } from "./desktop-board"
import { MobileBoard } from "./mobile-board"

interface NowLayerProps {
  boardId?: "featured" | "forks" | "stars"
  onFeedIdsChange?: (feedIds: string[]) => void
  className?: string
  isScattered?: boolean
  containerRef?: RefObject<HTMLDivElement | null>
}

export function NowLayer({
  boardId = "featured",
  onFeedIdsChange,
  className,
  isScattered,
  containerRef,
}: NowLayerProps) {
  const [feedIds, setFeedIds] = useState<string[]>([])
  const [feedsMap, setFeedsMap] = useState<Record<string, BoardFeed>>({})
  const starredFeedInstanceIds = useAtomValue(starredFeedInstanceIdsAtom)
  const feedInstances = useAtomValue(feedInstancesAtom)

  const { data: feeds, isPending } = trpc.getBoard.useQuery()

  const [prevBoardId, setPrevBoardId] = useState(boardId)
  if (prevBoardId !== boardId) {
    setPrevBoardId(boardId)
    setFeedIds([])
    setFeedsMap({})
  }

  useEffect(() => {
    if (feeds) {
      const { ids, map } = buildBoardFeeds({
        feeds,
        boardId,
        starredFeedInstanceIds,
        feedInstances,
      })
      setFeedIds(ids)
      setFeedsMap(map)
    }
  }, [feeds, boardId, starredFeedInstanceIds, feedInstances])

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

  if (!isPending && boardId === "forks" && feedIds.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-6 text-center text-sm text-muted-foreground">
        Fork a card to collect your feed forks here.
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
      isSortable={boardId === "forks" || boardId === "stars"}
      className={className}
      isScattered={isScattered}
      containerRef={containerRef}
      onFeedIdsChange={handleFeedIdsChange}
    />
  )
}
