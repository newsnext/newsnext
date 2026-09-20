import type { LoadedSourceDescriptor } from "@/lib/source/load-result"
import type { NewsItem } from "@/typings/source"
import { hashKey, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useRef } from "react"
import { getLoginUrlFromError } from "./source-login-error"
import {
  createLiveCardQueryTarget,
  createSourceQueryTarget,
  getSourceQueryKey,
  getSourceQueryOptions,
} from "./source-query"
import {
  findLiveCardSnapshot,
  findSourceSnapshot,
} from "./use-source-snapshot"

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
  const snapshotQuery = cardId
    ? findLiveCardSnapshot(queryClient, cardId, sourceId)
    : findSourceSnapshot(queryClient, sourceId, params)
  const snapshotResult = snapshotQuery?.data
  const target = useMemo(
    () => cardId
      ? createLiveCardQueryTarget(cardId)
      : createSourceQueryTarget(sourceId, source, params),
    [cardId, params, source, sourceId],
  )
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
  const query = useQuery({
    ...getSourceQueryOptions(target),
    enabled: enabled && (cardId !== undefined || source.version > 0),
    // Keep previous items visible across param edits; dropping to empty would flash skeletons on every keystroke.
    placeholderData: prev => prev,
  })
  const data = enabled ? query.data?.result ?? snapshotResult : undefined
  const hasData = data !== undefined

  return {
    items: data?.items ?? EMPTY_ITEMS,
    inlinePresentation: data?.inlinePresentation,
    refetch: query.refetch,
    isLoading: query.isLoading && snapshotResult === undefined,
    hasData,
    isError: query.isError && !hasData,
    errorMessage: !hasData && query.error instanceof Error ? query.error.message : undefined,
    loginUrl: hasData ? undefined : getLoginUrlFromError(query.error),
    metadata: data?.metadata,
    sourceSnapshot: data?.source,
  }
}
