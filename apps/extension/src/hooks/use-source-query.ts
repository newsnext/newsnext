import type { LoadedSourceDescriptor } from "@/lib/source/load-result"
import type { NewsItem } from "@/typings/source"
import { hashKey, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { getLoginUrlFromError } from "./source-login-error"
import {
  createInstanceQueryTarget,
  createSourceQueryTarget,
  getSourceQueryHash,
  getSourceQueryKey,
  getSourceQueryOptions,
} from "./source-query"
import {
  findCachedInstanceQuery,
  findCachedSourceQuery,
} from "./use-cached-source-result"
import { useIsSourceManualRequesting, useManualRequestSources } from "./use-manual-request"

const EMPTY_ITEMS: NewsItem[] = []

export interface UseSourceQueryOptions {
  source: LoadedSourceDescriptor
  sourceId: string
  enabled?: boolean
  instanceId?: string
  params?: Record<string, unknown>
}

export function useSourceQuery({
  sourceId,
  source,
  instanceId,
  params,
  enabled = true,
}: UseSourceQueryOptions) {
  const queryClient = useQueryClient()
  const cachedQuery = instanceId
    ? findCachedInstanceQuery(queryClient, instanceId, sourceId)
    : findCachedSourceQuery(queryClient, sourceId, params)
  const cachedResult = cachedQuery?.data
  const target = useMemo(
    () => instanceId
      ? createInstanceQueryTarget(instanceId)
      : createSourceQueryTarget(sourceId, source, params),
    [instanceId, params, source, sourceId],
  )
  const queryHash = useMemo(() => getSourceQueryHash(target), [target])
  const instanceRequestHash = useMemo(() => instanceId
    ? hashKey([sourceId, params ?? {}])
    : undefined, [instanceId, params, sourceId])
  const previousInstanceRequestRef = useRef<{
    hash: string
    instanceId: string
  } | undefined>(undefined)
  useEffect(() => {
    if (!instanceId || !instanceRequestHash) {
      previousInstanceRequestRef.current = undefined
      return
    }
    const previous = previousInstanceRequestRef.current
    previousInstanceRequestRef.current = { hash: instanceRequestHash, instanceId }
    if (previous?.instanceId === instanceId && previous.hash !== instanceRequestHash) {
      void queryClient.invalidateQueries({
        exact: true,
        queryKey: getSourceQueryKey(target),
      })
    }
  }, [instanceId, instanceRequestHash, queryClient, target])
  const manualRequestSources = useManualRequestSources()
  const isManualRequesting = useIsSourceManualRequesting(queryHash)
  const [initialLoadedAt] = useState(Date.now)
  const query = useQuery({
    ...getSourceQueryOptions(target),
    enabled: enabled && (instanceId !== undefined || source.version > 0),
    placeholderData: prev => prev,
  })
  const data = query.data?.result ?? cachedResult
  const hasData = data !== undefined

  const handleManualRequest = useCallback(async () => {
    if (!enabled) {
      return
    }

    await manualRequestSources(target)
  }, [enabled, manualRequestSources, target])

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
    sourceSnapshot: data?.source,
    loadedAt: query.data?.loadedAt
      ?? cachedQuery?.loadedAt
      ?? initialLoadedAt,
  }
}
