import type { NewsItem } from "@/typings/source"
import { useQuery } from "@tanstack/react-query"
import { useCallback, useMemo } from "react"
import { orpc } from "@/lib/orpc"
// import { useLocalStorageCache } from "./use-local-storage-cache"
import { consumeLatestSourceRefresh, useRefetch } from "./use-refetch"

export interface UseSourceQueryOptions {
  sourceId: string
  params?: Record<string, unknown>
  enabled?: boolean
}

// const STORAGE_PREFIX = "newsnext-source-cache"
export function useSourceQuery({ sourceId, params, enabled = true }: UseSourceQueryOptions) {
  const { refetch } = useRefetch()
  const normalizedParams = useMemo(() => params ?? {}, [params])
  // type SourceData = Awaited<ReturnType<typeof orpc.getSource.call>>
  // const storageKey = `${STORAGE_PREFIX}/${sourceId}`
  // const { readCache, writeCache } = useLocalStorageCache<SourceData>(storageKey)

  const { data, isFetching, isError, refetch: normalRefetch } = useQuery({
    queryKey: orpc.getSource.queryKey({ input: { sourceId, params: normalizedParams } }),
    queryFn: async () => {
      if (consumeLatestSourceRefresh({ sourceId, params: normalizedParams })) {
        return orpc.getSource.call({ sourceId, params: normalizedParams, latest: true })
      }
      return orpc.getSource.call({ sourceId, params: normalizedParams })
    },
    enabled,
    // placeholderData: prev => prev ?? readCache(),
    placeholderData: prev => prev,
    staleTime: 1000 * 60 * 3,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: true,
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
