import type { NewsItem } from "@/typings/source"
import { useQuery } from "@tanstack/react-query"
import { useCallback, useMemo } from "react"
import { loadClientSource } from "@/lib/client-source-loader"
// import { useLocalStorageCache } from "./use-local-storage-cache"
import { CLIENT_SOURCE_QUERY_KEY, consumeLatestSourceRefresh } from "./use-refetch"

export interface UseSourceQueryOptions {
  sourceId: string
  params?: Record<string, unknown>
  enabled?: boolean
  refetchInterval?: number | false
}

// const STORAGE_PREFIX = "newsnext-source-cache"
export function useSourceQuery({
  sourceId,
  params,
  enabled = true,
  refetchInterval = false,
}: UseSourceQueryOptions) {
  const normalizedParams = useMemo(() => params ?? {}, [params])
  // type SourceData = Awaited<ReturnType<typeof loadClientSource>>
  // const storageKey = `${STORAGE_PREFIX}/${sourceId}`
  // const { readCache, writeCache } = useLocalStorageCache<SourceData>(storageKey)

  const { data, error, isFetching, isError, refetch: normalRefetch } = useQuery({
    queryKey: [...CLIENT_SOURCE_QUERY_KEY, sourceId, normalizedParams],
    queryFn: () => loadClientSource(sourceId, normalizedParams, {
      forceFresh: consumeLatestSourceRefresh({ sourceId, params: normalizedParams }),
    }),
    enabled,
    // placeholderData: prev => prev ?? readCache(),
    placeholderData: prev => prev,
    staleTime: 1000 * 60 * 3,
    refetchOnMount: "always",
    refetchOnReconnect: false,
    refetchOnWindowFocus: true,
    refetchInterval,
    refetchIntervalInBackground: true,
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
    if (!enabled) {
      return
    }

    await normalRefetch()
  }, [enabled, normalRefetch])

  return {
    data,
    items: (data?.items || []) as NewsItem[],
    refetch: handleRefetch,
    normalRefetch,
    isFetching,
    isError,
    errorMessage: error instanceof Error ? error.message : undefined,
    updatedAt: data?.updatedAt ?? Date.now(),
  }
}
