import type { LoadedSourceDescriptor } from "@/lib/source/load-result"
import type { NewsItem } from "@/typings/source"
import { hashKey, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { getLoginUrlFromError } from "./source-login-error"
import {
  createLiveCardQueryTarget,
  createSourceQueryTarget,
  getSourceQueryHash,
  getSourceQueryKey,
  getSourceQueryOptions,
} from "./source-query"
import {
  findCachedLiveCardQuery,
  findCachedSourceQuery,
} from "./use-cached-source-result"
import { useIsSourceManualRequesting, useManualRequestSources } from "./use-manual-request"

const EMPTY_ITEMS: NewsItem[] = []

export interface UseSourceQueryOptions {
  source: LoadedSourceDescriptor
  sourceId: string
  enabled?: boolean
  cardId?: string
  params?: Record<string, unknown>
}

export function useSourceQuery({
  sourceId,
  source,
  cardId,
  params,
  enabled = true,
}: UseSourceQueryOptions) {
  const queryClient = useQueryClient()
  const cachedQuery = cardId
    ? findCachedLiveCardQuery(queryClient, cardId, sourceId)
    : findCachedSourceQuery(queryClient, sourceId, params)
  const cachedResult = cachedQuery?.data
  const target = useMemo(
    () => cardId
      ? createLiveCardQueryTarget(cardId)
      : createSourceQueryTarget(sourceId, source, params),
    [cardId, params, source, sourceId],
  )
  const queryHash = useMemo(() => getSourceQueryHash(target), [target])
  const liveCardRequestHash = useMemo(() => cardId
    ? hashKey([sourceId, params ?? {}])
    : undefined, [cardId, params, sourceId])
  const previousLiveCardRequestRef = useRef<{
    hash: string
    cardId: string
  } | undefined>(undefined)
  useEffect(() => {
    if (!cardId || !liveCardRequestHash) {
      previousLiveCardRequestRef.current = undefined
      return
    }
    const previous = previousLiveCardRequestRef.current
    previousLiveCardRequestRef.current = { hash: liveCardRequestHash, cardId }
    if (previous?.cardId === cardId && previous.hash !== liveCardRequestHash) {
      void queryClient.invalidateQueries({
        exact: true,
        queryKey: getSourceQueryKey(target),
      })
    }
  }, [cardId, liveCardRequestHash, queryClient, target])
  const manualRequestSources = useManualRequestSources()
  const isManualRequesting = useIsSourceManualRequesting(queryHash)
  const query = useQuery({
    ...getSourceQueryOptions(target),
    enabled: enabled && (cardId !== undefined || source.version > 0),
    placeholderData: prev => prev,
  })
  const data = enabled ? query.data?.result ?? cachedResult : undefined
  const hasData = data !== undefined

  const handleManualRequest = useCallback(async () => {
    if (!enabled) {
      return
    }

    await manualRequestSources(target)
  }, [enabled, manualRequestSources, target])

  return {
    items: data?.items ?? EMPTY_ITEMS,
    inlinePresentation: data?.inlinePresentation,
    manualRequest: handleManualRequest,
    isFetching: query.isFetching,
    isManualRequesting,
    isLoading: query.isLoading && cachedResult === undefined,
    isError: query.isError && !hasData,
    errorMessage: !hasData && query.error instanceof Error ? query.error.message : undefined,
    loginUrl: hasData ? undefined : getLoginUrlFromError(query.error),
    metadata: data?.metadata,
    sourceSnapshot: data?.source,
  }
}
