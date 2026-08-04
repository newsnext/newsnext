import type { NewsItem } from "@/typings/source"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useMemo, useState } from "react"
import { getLoginUrlFromError } from "./source-login-error"
import {
  createSourceQueryTarget,
  getSourceQueryHash,
  getSourceQueryOptions,
} from "./source-query"
import { useFetchLatestSources, useIsSourceFetchingLatest } from "./use-refetch"
import { useSourceDescriptors } from "./use-source-descriptors"

const EMPTY_ITEMS: NewsItem[] = []

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
  const target = useMemo(
    () => source
      ? createSourceQueryTarget(sourceId, source, params)
      : { sourceId, params: {} },
    [params, source, sourceId],
  )
  const queryHash = useMemo(() => getSourceQueryHash(target), [target])
  const queryClient = useQueryClient()
  const fetchLatestSources = useFetchLatestSources()
  const isFetchingLatest = useIsSourceFetchingLatest(queryHash)
  const [initialUpdatedAt] = useState(Date.now)
  const { data, error, isFetching, isError, isLoading } = useQuery({
    ...getSourceQueryOptions(queryClient, target),
    enabled: enabled && source !== undefined,
    placeholderData: prev => prev,
  })

  const handleFetchLatest = useCallback(async () => {
    if (!enabled) {
      return
    }

    await fetchLatestSources(target)
  }, [enabled, fetchLatestSources, target])

  return {
    items: data?.items ?? EMPTY_ITEMS,
    fetchLatest: handleFetchLatest,
    isFetching,
    isFetchingLatest,
    isLoading,
    isError,
    errorMessage: error instanceof Error ? error.message : undefined,
    loginUrl: getLoginUrlFromError(error),
    metadata: data?.metadata,
    updatedAt: data?.updatedAt ?? initialUpdatedAt,
  }
}
