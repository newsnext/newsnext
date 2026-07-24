import type { NewsItem } from "@/typings/source"
import { normalizeSourceParams, resolveSource } from "@newsnext/source/service"
import { useQuery } from "@tanstack/react-query"
import { useCallback, useMemo } from "react"
import { buildSourceCacheKey, loadSource } from "@/lib/source-loader"
// import { useLocalStorageCache } from "./use-local-storage-cache"
import { getLoginUrlFromError } from "./source-login-error"
import { consumeLatestSourceRefresh, SOURCE_QUERY_KEY } from "./use-refetch"

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
  const source = useMemo(() => resolveSource(sourceId), [sourceId])
  const normalizedParams = useMemo(() => normalizeSourceParams(source, params ?? {}), [params, source])
  const cacheKey = useMemo(
    () => buildSourceCacheKey(sourceId, source.cache.version, normalizedParams),
    [normalizedParams, source.cache.version, sourceId],
  )
  // type SourceData = Awaited<ReturnType<typeof loadSource>>
  // const storageKey = `${STORAGE_PREFIX}/${sourceId}`
  // const { readCache, writeCache } = useLocalStorageCache<SourceData>(storageKey)

  const { data, error, isFetching, isError, refetch: normalRefetch } = useQuery({
    queryKey: [...SOURCE_QUERY_KEY, cacheKey],
    queryFn: () => loadSource(sourceId, normalizedParams, {
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
    loginUrl: getLoginUrlFromError(error),
    updatedAt: data?.updatedAt ?? Date.now(),
  }
}
