import type { NewsItem } from "@/typings/source"
import { normalizeSourceParams } from "@newsnext/source/runtime"
import { useQuery } from "@tanstack/react-query"
import { useCallback, useMemo, useState } from "react"
import { loadSource } from "@/lib/source-loader"
// import { useLocalStorageCache } from "./use-local-storage-cache"
import { getLoginUrlFromError } from "./source-login-error"
import {
  consumeLatestSourceRefresh,
  getSourceRefreshKey,
  SOURCE_QUERY_KEY,
} from "./use-refetch"
import { useSourceDescriptors } from "./use-source-descriptors"

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
  const { sources } = useSourceDescriptors()
  const source = useMemo(
    () => sources.find(candidate => candidate.id === sourceId),
    [sourceId, sources],
  )
  const normalizedParams = useMemo(
    () => source ? normalizeSourceParams(source, params ?? {}) : {},
    [params, source],
  )
  const refreshKey = useMemo(
    () => getSourceRefreshKey({ sourceId, params: normalizedParams }),
    [normalizedParams, sourceId],
  )
  // type SourceData = Awaited<ReturnType<typeof loadSource>>
  // const storageKey = `${STORAGE_PREFIX}/${sourceId}`
  // const { readCache, writeCache } = useLocalStorageCache<SourceData>(storageKey)

  const [initialUpdatedAt] = useState(Date.now)
  const { data, error, isFetching, isError, refetch: normalRefetch } = useQuery({
    queryKey: [...SOURCE_QUERY_KEY, refreshKey],
    queryFn: () => loadSource(sourceId, normalizedParams, {
      forceFresh: consumeLatestSourceRefresh({ sourceId, params: normalizedParams }),
    }),
    enabled: enabled && source !== undefined,
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
    updatedAt: data?.updatedAt ?? initialUpdatedAt,
  }
}
