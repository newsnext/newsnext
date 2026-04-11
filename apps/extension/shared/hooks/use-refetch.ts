import { useIsFetching } from "@tanstack/react-query"
import { getQueryKey } from "@trpc/react-query"
import { useAtomValue } from "jotai"
import { useCallback, useMemo } from "react"
import { trpc } from "@/lib/trpc"
import { currentBoardAtom, starredFeedIdsAtom } from "@/store/board"

export const refetchFeeds = new Set<string>()

export function useRefetch() {
  const utils = trpc.useUtils()
  const currentBoard = useAtomValue(currentBoardAtom)
  const starredFeedIds = useAtomValue(starredFeedIdsAtom)
  const fetchingCount = useIsFetching({ queryKey: getQueryKey(trpc.getFeed) })

  const isFetching = useMemo(() => fetchingCount > 0, [fetchingCount])

  /**
   * Force refresh specific feeds.
   */
  const refetch = useCallback(
    async (...feedIds: string[]) => {
      try {
        feedIds.forEach(id => refetchFeeds.add(id))

        await Promise.all(
          feedIds.map(feedId =>
            utils.getFeed.invalidate({ feedId }),
          ),
        )
      } catch (e) {
        console.error("Failed to refresh feeds", e)
      }
    },
    [utils],
  )

  /**
   * Refresh all feeds in the current board.
   */
  const refetchAll = useCallback(async () => {
    try {
      const feeds = await utils.getBoard.ensureData({ boardId: currentBoard, starredFeedIds })
      const feedIds = feeds.map(feed => feed.provider ? `${feed.provider}:${feed.id}` : feed.id)

      feedIds.forEach(id => refetchFeeds.add(id))

      await Promise.all(
        feedIds.map(feedId =>
          utils.getFeed.invalidate({ feedId }),
        ),
      )
    } catch (e) {
      console.error("Failed to refresh board feeds", e)
    }
  }, [utils, currentBoard, starredFeedIds])

  return {
    refetch,
    refetchAll,
    isFetching,
  }
}
