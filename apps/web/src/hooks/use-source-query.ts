import type { NewsItem } from "@/typings/source"
import { useQuery } from "@tanstack/react-query"
import { useCallback, useMemo } from "react"
import { loadLocalSource } from "@/lib/local-source-loader"
import { orpc } from "@/lib/orpc"
// import { useLocalStorageCache } from "./use-local-storage-cache"
import { consumeLatestSourceRefresh, useSourceRefetch } from "./use-refetch"

export interface UseSourceQueryOptions {
  sourceId: string
  params?: Record<string, unknown>
  enabled?: boolean
  forceLatest?: boolean
  isLocalOnly?: boolean
  refetchInterval?: number | false
}

// const STORAGE_PREFIX = "newsnext-source-cache"
export function useSourceQuery({
  sourceId,
  params,
  enabled = true,
  forceLatest = false,
  isLocalOnly = false,
  refetchInterval = false,
}: UseSourceQueryOptions) {
  const refetch = useSourceRefetch()
  const normalizedParams = useMemo(() => params ?? {}, [params])
  // type SourceData = Awaited<ReturnType<typeof orpc.getSource.call>>
  // const storageKey = `${STORAGE_PREFIX}/${sourceId}`
  // const { readCache, writeCache } = useLocalStorageCache<SourceData>(storageKey)

  const { data, error, isFetching, isError, refetch: normalRefetch } = useQuery({
    queryKey: isLocalOnly
      ? ["local-source", sourceId, normalizedParams]
      : orpc.getSource.queryKey({ input: { sourceId, params: normalizedParams } }),
    queryFn: async () => {
      if (isLocalOnly) {
        return loadLocalSource(sourceId, normalizedParams)
      }

      if (forceLatest || consumeLatestSourceRefresh({ sourceId, params: normalizedParams })) {
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

    if (isLocalOnly) {
      await normalRefetch()
      return
    }

    await refetch({ sourceId, params: normalizedParams })
  }, [enabled, isLocalOnly, normalRefetch, sourceId, normalizedParams, refetch])

  return {
    data,
    items: (data?.items || []) as NewsItem[],
    refetch: handleRefetch,
    normalRefetch,
    isFetching,
    isError,
    errorMessage: error instanceof Error ? error.message : undefined,
    updatedTime: data?.updated ?? Date.now(),
  }
}
