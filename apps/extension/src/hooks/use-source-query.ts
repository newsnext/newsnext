import type { NewsItem } from "@/typings/source"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useMemo, useState } from "react"
import { getLoginUrlFromError } from "./source-login-error"
import {
  createSourceQueryTarget,
  getSourceQueryHash,
  getSourceQueryOptions,
} from "./source-query"
import {
  findCachedSourceQuery,
  findSourceQueryDataUpdatedAt,
} from "./use-cached-source-result"
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
  const queryClient = useQueryClient()
  const source = useMemo(
    () => sources.find(candidate => candidate.id === sourceId),
    [sourceId, sources],
  )
  const cachedQuery = findCachedSourceQuery(queryClient, sourceId, params)
  const cachedResult = cachedQuery?.data
  const target = useMemo(
    () => source || cachedResult?.source
      ? createSourceQueryTarget(sourceId, source ?? cachedResult!.source, params)
      : { sourceId, params: {}, version: 0 },
    [cachedResult, params, source, sourceId],
  )
  const queryHash = useMemo(() => getSourceQueryHash(target), [target])
  const fetchLatestSources = useFetchLatestSources()
  const isFetchingLatest = useIsSourceFetchingLatest(queryHash)
  const [initialUpdatedAt] = useState(Date.now)
  const query = useQuery({
    ...getSourceQueryOptions(target),
    enabled: enabled && source !== undefined,
    placeholderData: prev => prev,
  })
  const data = query.data ?? cachedResult
  const placeholderDataUpdatedAt = query.isPlaceholderData && query.data
    ? findSourceQueryDataUpdatedAt(queryClient, query.data)
    : undefined

  const handleFetchLatest = useCallback(async () => {
    if (!enabled || !source) {
      return
    }

    await fetchLatestSources(target)
  }, [enabled, fetchLatestSources, source, target])

  return {
    items: data?.items ?? EMPTY_ITEMS,
    itemTemplate: data?.itemTemplate,
    fetchLatest: handleFetchLatest,
    isFetching: query.isFetching,
    isFetchingLatest,
    isLoading: query.isLoading && cachedResult === undefined,
    isError: query.isError,
    errorMessage: query.error instanceof Error ? query.error.message : undefined,
    loginUrl: getLoginUrlFromError(query.error),
    metadata: data?.metadata,
    updatedAt: query.dataUpdatedAt
      || cachedQuery?.dataUpdatedAt
      || placeholderDataUpdatedAt
      || initialUpdatedAt,
  }
}
