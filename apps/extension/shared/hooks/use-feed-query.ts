import type { NewsItem } from "@/typings/feed"
import { useQuery } from "@tanstack/react-query"
import { getQueryKey } from "@trpc/react-query"
import { useCallback, useMemo } from "react"
import { buildFeedRequestKey } from "@/lib/feed-cards"
import { trpc } from "@/lib/trpc"
// import { useLocalStorageCache } from "./use-local-storage-cache"
import { refetchFeeds, useRefetch } from "./use-refetch"

export interface UseFeedQueryOptions {
  feedId: string
  params?: Record<string, unknown>
  enabled?: boolean
}

// const STORAGE_PREFIX = "newsnext-feed-cache"
export function useFeedQuery({ feedId, params, enabled = true }: UseFeedQueryOptions) {
  const utils = trpc.useUtils()
  const { refetch } = useRefetch()
  const normalizedParams = useMemo(() => params ?? {}, [params])
  const refreshKey = useMemo(() => buildFeedRequestKey(feedId, normalizedParams), [feedId, normalizedParams])
  // type FeedData = Awaited<ReturnType<typeof utils.client.getFeed.query>>
  // const storageKey = `${STORAGE_PREFIX}/${feedId}`
  // const { readCache, writeCache } = useLocalStorageCache<SourceData>(storageKey)

  const { data, isFetching, isError, refetch: normalRefetch } = useQuery({
    queryKey: getQueryKey(trpc.getFeed, { feedId, params: normalizedParams }),
    queryFn: async () => {
      const isRefetch = refetchFeeds.has(refreshKey)
      if (isRefetch) {
        refetchFeeds.delete(refreshKey)
        return utils.client.getFeed.query({ feedId, params: normalizedParams, latest: true })
      }
      return utils.client.getFeed.query({ feedId, params: normalizedParams })
    },
    enabled,
    // placeholderData: prev => prev ?? readCache(),
    placeholderData: prev => prev,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    retry: false,
  })

  // useEffect(() => {
  //   if (data?.items.length) {
  //     writeCache({
  //       ...data,
  //       items: data.items.slice(0, 15),
  //     })
  //   }
  // }, [data, writeCache])

  const handleRefetch = useCallback(async () => {
    await refetch({ feedId, params: normalizedParams })
  }, [feedId, normalizedParams, refetch])

  return {
    data,
    items: (data?.items || []) as NewsItem[],
    refetch: handleRefetch,
    normalRefetch,
    isFetching,
    isError,
    updatedTime: data?.updated ?? Date.now(),
  }
}
