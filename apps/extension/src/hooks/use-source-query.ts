import type { NewsItem } from "@/typings/source"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useMemo, useState } from "react"
import { getLoginUrlFromError } from "./source-login-error"
import {
  createSourceQueryTarget,
  getSourceQueryHash,
  getSourceQueryOptions,
} from "./source-query"
import { findCachedSourceQuery } from "./use-cached-source-result"
import { useFetchLatestSources, useIsSourceFetchingLatest } from "./use-refetch"
import { useSourceDescriptors } from "./use-source-descriptors"

const EMPTY_ITEMS: NewsItem[] = []

export interface UseSourceQueryOptions {
  instanceId?: string
  sourceId: string
  params?: Record<string, unknown>
  remote?: boolean
  enabled?: boolean
}

export function useSourceQuery({
  instanceId,
  sourceId,
  params,
  remote = false,
  enabled = true,
}: UseSourceQueryOptions) {
  const { sources } = useSourceDescriptors()
  const queryClient = useQueryClient()
  const source = useMemo(
    () => sources.find(candidate => candidate.id === sourceId),
    [sourceId, sources],
  )
  const cachedQuery = findCachedSourceQuery(queryClient, sourceId, params, instanceId)
  const cachedResult = cachedQuery?.data
  const target = useMemo(
    () => source || cachedResult?.source
      ? createSourceQueryTarget(sourceId, source ?? cachedResult!.source, params, instanceId, remote)
      : { sourceId, params: {}, version: 0, ...(instanceId ? { instanceId } : {}), ...(remote ? { remote: true } : {}) },
    [cachedResult, instanceId, params, remote, source, sourceId],
  )
  const queryHash = useMemo(() => getSourceQueryHash(target), [target])
  const fetchLatestSources = useFetchLatestSources()
  const isFetchingLatest = useIsSourceFetchingLatest(queryHash)
  const [initialLoadedAt] = useState(Date.now)
  const query = useQuery({
    ...getSourceQueryOptions(target),
    enabled: enabled && source !== undefined,
    placeholderData: prev => prev,
  })
  const data = query.data?.result ?? cachedResult
  const hasData = data !== undefined

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
    isError: query.isError && !hasData,
    errorMessage: !hasData && query.error instanceof Error ? query.error.message : undefined,
    loginUrl: hasData ? undefined : getLoginUrlFromError(query.error),
    metadata: data?.metadata,
    loadedAt: query.data?.loadedAt
      ?? cachedQuery?.loadedAt
      ?? initialLoadedAt,
  }
}
