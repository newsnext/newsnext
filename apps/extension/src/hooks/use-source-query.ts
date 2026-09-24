import type { LoadedSourceDescriptor } from "@/lib/source/load-result"
import { hashKey, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useRef } from "react"
import { getLoginUrlFromError } from "./source-login-error"
import {
  createLiveCardQueryTarget,
  createSourceQueryTarget,
  getLiveCardSnapshotQueryKey,
  getLiveCardSnapshotQueryOptions,
  getSourceQueryKey,
  getSourceQueryOptions,
} from "./source-query"
import {
  findSourceSnapshot,
} from "./use-source-snapshot"

export interface UseSourceQueryOptions {
  source: LoadedSourceDescriptor
  sourceId: string
  freshLoadEnabled?: boolean
  cardId?: string
  params?: Record<string, unknown>
}

export function useSourceQuery({
  sourceId,
  source,
  cardId,
  params,
  freshLoadEnabled = true,
}: UseSourceQueryOptions) {
  const queryClient = useQueryClient()
  const liveCardSnapshotQuery = useQuery({
    ...getLiveCardSnapshotQueryOptions(cardId ?? ""),
    enabled: cardId !== undefined,
  })
  const sourceSnapshot = cardId
    ? undefined
    : findSourceSnapshot(queryClient, sourceId, params)
  const snapshotResult = liveCardSnapshotQuery.data?.result ?? sourceSnapshot?.data
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
    enabled: freshLoadEnabled
      && (cardId !== undefined || source.version > 0)
      && (cardId === undefined || liveCardSnapshotQuery.isFetched),
    // Keep previous items visible across param edits; dropping to empty would flash skeletons on every keystroke.
    placeholderData: prev => prev,
  })
  useEffect(() => {
    if (!cardId || !query.data) return
    queryClient.setQueryData(getLiveCardSnapshotQueryKey(cardId), query.data)
  }, [cardId, query.data, queryClient])
  const data = query.data?.result ?? snapshotResult
  const hasData = data !== undefined

  return {
    result: data,
    historyParams: query.data?.params ?? liveCardSnapshotQuery.data?.params,
    refetch: query.refetch,
    isLoading: (liveCardSnapshotQuery.isLoading || query.isLoading) && snapshotResult === undefined,
    isError: query.isError && !hasData,
    errorMessage: !hasData && query.error instanceof Error ? query.error.message : undefined,
    loginUrl: hasData ? undefined : getLoginUrlFromError(query.error),
  }
}
