import { normalizeSourceParams } from "@newsnext/source/runtime"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useMemo, useState } from "react"
import {
  SOURCE_QUERY_REFETCH_INTERVAL_MS,
  SOURCE_QUERY_STALE_TIME_MS,
} from "@/lib/source-query-policy"
import { getLoginUrlFromError } from "./source-login-error"
import { getSourceQueryHash, getSourceQueryKey, loadSourceQuery } from "./source-query"
import { useFetchLatestSources, useIsSourceFetchingLatest } from "./use-refetch"
import { useSourceDescriptors } from "./use-source-descriptors"

export interface UseSourceQueryOptions {
  sourceId: string
  params?: Record<string, unknown>
  enabled?: boolean
}

export function useSourceQuery({
  sourceId,
  params,
  enabled = true,
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
  const target = useMemo(
    () => ({ sourceId, params: normalizedParams }),
    [normalizedParams, sourceId],
  )
  const queryKey = useMemo(() => getSourceQueryKey(target), [target])
  const queryHash = useMemo(() => getSourceQueryHash(target), [target])
  const queryClient = useQueryClient()
  const fetchLatestSources = useFetchLatestSources()
  const isFetchingLatest = useIsSourceFetchingLatest(queryHash)
  const [initialUpdatedAt] = useState(Date.now)
  const { data, error, isFetching, isError } = useQuery({
    queryKey,
    queryFn: () => loadSourceQuery(queryClient, target),
    enabled: enabled && source !== undefined,
    placeholderData: prev => prev,
    staleTime: SOURCE_QUERY_STALE_TIME_MS,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    refetchInterval: SOURCE_QUERY_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: true,
    retry: false,
  })

  const handleFetchLatest = useCallback(async () => {
    if (!enabled) {
      return
    }

    await fetchLatestSources(target)
  }, [enabled, fetchLatestSources, target])

  return {
    items: data?.items ?? [],
    fetchLatest: handleFetchLatest,
    isFetching,
    isFetchingLatest,
    isError,
    errorMessage: error instanceof Error ? error.message : undefined,
    loginUrl: getLoginUrlFromError(error),
    metadata: data?.metadata,
    updatedAt: data?.updatedAt ?? initialUpdatedAt,
  }
}
