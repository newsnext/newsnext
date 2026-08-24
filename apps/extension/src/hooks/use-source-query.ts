import type { RemoteSourceQueryTarget } from "@/lib/source/query-target"
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
import { useIsSourceManualRequesting, useManualRequestSources } from "./use-manual-request"
import { useSourceDescriptors } from "./use-source-descriptors"

const EMPTY_ITEMS: NewsItem[] = []

export interface UseSourceQueryOptions {
  sourceId: string
  params?: Record<string, unknown>
  remote?: RemoteSourceQueryTarget
  enabled?: boolean
}

export function useSourceQuery({
  sourceId,
  params,
  remote,
  enabled = true,
}: UseSourceQueryOptions) {
  const { sources } = useSourceDescriptors()
  const queryClient = useQueryClient()
  const source = useMemo(
    () => sources.find(candidate => candidate.id === sourceId),
    [sourceId, sources],
  )
  const cachedQuery = findCachedSourceQuery(queryClient, sourceId, params, remote)
  const cachedResult = cachedQuery?.data
  const target = useMemo(() => {
    if (source || cachedResult?.source) {
      return createSourceQueryTarget(sourceId, source ?? cachedResult!.source, params, remote)
    }

    const unresolvedTarget = { sourceId, params: {}, version: 0 }
    return remote
      ? { ...unresolvedTarget, ...remote, remote: true as const }
      : unresolvedTarget
  }, [cachedResult, params, remote, source, sourceId])
  const queryHash = useMemo(() => getSourceQueryHash(target), [target])
  const manualRequestSources = useManualRequestSources()
  const isManualRequesting = useIsSourceManualRequesting(queryHash)
  const [initialLoadedAt] = useState(Date.now)
  const query = useQuery({
    ...getSourceQueryOptions(target),
    enabled: enabled && source !== undefined,
    placeholderData: prev => prev,
  })
  const data = query.data?.result ?? cachedResult
  const hasData = data !== undefined

  const handleManualRequest = useCallback(async () => {
    if (!enabled || !source) {
      return
    }

    await manualRequestSources(target)
  }, [enabled, manualRequestSources, source, target])

  return {
    items: data?.items ?? EMPTY_ITEMS,
    itemTemplate: data?.itemTemplate,
    manualRequest: handleManualRequest,
    isFetching: query.isFetching,
    isManualRequesting,
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
