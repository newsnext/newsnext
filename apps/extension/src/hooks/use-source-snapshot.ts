import type { QueryClient } from "@tanstack/react-query"
import type { SourceLoadResponse, SourceLoadResult } from "@/lib/source/load-result"
import { useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import {
  createLiveCardQueryTarget,
  createSourceQueryTarget,
  getSourceQueryHash,
  getSourceQueryKey,
  SOURCE_QUERY_KEY,
} from "@/hooks/source-query"

export interface SourceSnapshotQuery {
  data: SourceLoadResult
  loadedAt: number
}

function getSourceLoadResponse(
  value: unknown,
): Partial<SourceLoadResponse> | undefined {
  if (typeof value !== "object" || value === null) return undefined
  return value
}

function readSourceSnapshotQuery(
  value: unknown,
  sourceId: string,
): SourceSnapshotQuery | undefined {
  const response = getSourceLoadResponse(value)
  const result = response?.result
  if (
    !result
    || result.source?.id !== sourceId
    || typeof response.loadedAt !== "number"
  ) {
    return undefined
  }
  return { data: result, loadedAt: response.loadedAt }
}

export function findLiveCardSnapshot(
  queryClient: QueryClient,
  cardId: string,
  sourceId: string,
): SourceSnapshotQuery | undefined {
  return readSourceSnapshotQuery(
    queryClient.getQueryData(
      getSourceQueryKey(createLiveCardQueryTarget(cardId)),
    ),
    sourceId,
  )
}

export function findSourceSnapshot(
  queryClient: QueryClient,
  sourceId: string,
  params: Record<string, unknown> | undefined,
): SourceSnapshotQuery | undefined {
  const queries = queryClient.getQueryCache()
    .findAll({ queryKey: SOURCE_QUERY_KEY })
    .filter(query => query.state.data !== undefined)

  for (const query of queries) {
    const snapshot = readSourceSnapshotQuery(query.state.data, sourceId)
    if (!snapshot) continue
    const target = createSourceQueryTarget(sourceId, snapshot.data.source, params)
    if (query.queryHash === getSourceQueryHash(target)) {
      return snapshot
    }
  }
}

export function findSourceSnapshotResult(
  queryClient: QueryClient,
  sourceId: string,
  params: Record<string, unknown> | undefined,
): SourceLoadResult | undefined {
  return findSourceSnapshot(queryClient, sourceId, params)?.data
}

export function useLiveCardSnapshotFinder(): (
  cardId: string,
  sourceId: string,
) => SourceLoadResult | undefined {
  const queryClient = useQueryClient()
  return useCallback((cardId, sourceId) => {
    return findLiveCardSnapshot(queryClient, cardId, sourceId)?.data
  }, [queryClient])
}
