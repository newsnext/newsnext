import { normalizeSourceParams } from "@newsnext/source/runtime"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useMemo, useState } from "react"
import { getLoginUrlFromError } from "./source-login-error"
import { getSourceQueryHash, getSourceQueryKey, loadSourceQuery } from "./source-query"
import { useIsSourceRefreshing, useSourceRefetch } from "./use-refetch"
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
  const refetchSource = useSourceRefetch()
  const isRefreshing = useIsSourceRefreshing(queryHash)
  const [initialUpdatedAt] = useState(Date.now)
  const { data, error, isFetching, isError } = useQuery({
    queryKey,
    queryFn: () => loadSourceQuery(queryClient, target),
    enabled: enabled && source !== undefined,
    placeholderData: prev => prev,
    staleTime: 60_000,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: true,
    retry: false,
  })

  const handleRefetch = useCallback(async () => {
    if (!enabled) {
      return
    }

    await refetchSource(target)
  }, [enabled, refetchSource, target])

  return {
    items: data?.items ?? [],
    refetch: handleRefetch,
    isFetching,
    isRefreshing,
    isError,
    errorMessage: error instanceof Error ? error.message : undefined,
    loginUrl: getLoginUrlFromError(error),
    metadata: data?.metadata,
    updatedAt: data?.updatedAt ?? initialUpdatedAt,
  }
}
