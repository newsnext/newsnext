import { useIsFetching } from "@tanstack/react-query"
import { getQueryKey } from "@trpc/react-query"
import { useAtomValue } from "jotai"
import { useCallback, useMemo } from "react"
import { buildBoardFeeds, buildFeedRequestKey } from "@/lib/feed-cards"
import { getSavedFeedParamValues } from "@/lib/feed-params"
import { trpc } from "@/lib/trpc"
import { currentBoardAtom, feedInstancesAtom, starredFeedInstanceIdsAtom } from "@/store/board"

export const refetchFeeds = new Set<string>()

interface RefetchTarget {
  feedId: string
  params?: Record<string, unknown>
}

export function useRefetch() {
  const utils = trpc.useUtils()
  const currentBoard = useAtomValue(currentBoardAtom)
  const starredFeedInstanceIds = useAtomValue(starredFeedInstanceIdsAtom)
  const feedInstances = useAtomValue(feedInstancesAtom)
  const fetchingCount = useIsFetching({ queryKey: getQueryKey(trpc.getFeed) })

  const isFetching = useMemo(() => fetchingCount > 0, [fetchingCount])

  /**
   * Force refresh specific feeds.
   */
  const refetch = useCallback(
    async (...targets: RefetchTarget[]) => {
      try {
        const uniqueTargets = [...new Map(
          targets.map(target => [buildFeedRequestKey(target.feedId, target.params ?? {}), target]),
        ).values()]

        uniqueTargets.forEach(target => refetchFeeds.add(buildFeedRequestKey(target.feedId, target.params ?? {})))

        await Promise.all(
          uniqueTargets.map(target =>
            utils.getFeed.invalidate({ feedId: target.feedId, params: target.params ?? {} }),
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
      const feeds = await utils.getBoard.ensureData()
      const boardFeeds = buildBoardFeeds({
        feeds,
        boardId: currentBoard,
        starredFeedInstanceIds,
        feedInstances,
      })
      const targets = boardFeeds.ids.map((id) => {
        const feed = boardFeeds.map[id]
        return {
          feedId: feed.feedId,
          params: feed.paramsValue ?? getSavedFeedParamValues(feed.id, feed.params),
        } satisfies RefetchTarget
      })
      const uniqueTargets = [...new Map(
        targets.map(target => [buildFeedRequestKey(target.feedId, target.params ?? {}), target]),
      ).values()]

      uniqueTargets.forEach(target => refetchFeeds.add(buildFeedRequestKey(target.feedId, target.params ?? {})))

      await Promise.all(
        uniqueTargets.map(target =>
          utils.getFeed.invalidate({ feedId: target.feedId, params: target.params ?? {} }),
        ),
      )
    } catch (e) {
      console.error("Failed to refresh board feeds", e)
    }
  }, [utils, currentBoard, starredFeedInstanceIds, feedInstances])

  return {
    refetch,
    refetchAll,
    isFetching,
  }
}
