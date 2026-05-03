import type { NewsItem } from "@/typings/source"
import { useQuery } from "@tanstack/react-query"
import { getQueryKey } from "@trpc/react-query"
import { useCallback, useMemo } from "react"
import { buildSourceRequestKey } from "@/lib/source-cards"
import { trpc } from "@/lib/trpc"
// import { useLocalStorageCache } from "./use-local-storage-cache"
import { refetchSources, useRefetch } from "./use-refetch"

export interface UseSourceQueryOptions {
  sourceId: string
  params?: Record<string, unknown>
  enabled?: boolean
}

// const STORAGE_PREFIX = "newsnext-source-cache"
export function useSourceQuery({ sourceId, params, enabled = true }: UseSourceQueryOptions) {
  const utils = trpc.useUtils()
  const { refetch } = useRefetch()
  const normalizedParams = useMemo(() => params ?? {}, [params])
  const refreshKey = useMemo(() => buildSourceRequestKey(sourceId, normalizedParams), [sourceId, normalizedParams])
  // type SourceData = Awaited<ReturnType<typeof utils.client.getSource.query>>
  // const storageKey = `${STORAGE_PREFIX}/${sourceId}`
  // const { readCache, writeCache } = useLocalStorageCache<SourceData>(storageKey)

  const { data, isFetching, isError, refetch: normalRefetch } = useQuery({
    queryKey: getQueryKey(trpc.getSource, { sourceId, params: normalizedParams }),
    queryFn: async () => {
      const isRefetch = refetchSources.has(refreshKey)
      if (isRefetch) {
        refetchSources.delete(refreshKey)
        return utils.client.getSource.query({ sourceId, params: normalizedParams, latest: true })
      }
      return utils.client.getSource.query({ sourceId, params: normalizedParams })
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
    await refetch({ sourceId, params: normalizedParams })
  }, [sourceId, normalizedParams, refetch])

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
