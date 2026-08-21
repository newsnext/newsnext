import type { QueryClient } from "@tanstack/react-query"
import type { SourceLoadResult } from "@/lib/source/load-result"
import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useState } from "react"
import {
  createSourceQueryTarget,
  getSourceQueryHash,
  SOURCE_QUERY_KEY,
} from "@/hooks/source-query"
import { restorePersistedSourceQueries } from "@/lib/source/query-persister"

export interface CachedSourceQuery {
  data: SourceLoadResult
  dataUpdatedAt: number
}

export function findCachedSourceQuery(
  queryClient: QueryClient,
  sourceId: string,
  params: Record<string, unknown> | undefined,
): CachedSourceQuery | undefined {
  const queries = queryClient.getQueryCache()
    .findAll({ queryKey: SOURCE_QUERY_KEY })
    .filter(query => query.state.data !== undefined)
    .toSorted((left, right) => right.state.dataUpdatedAt - left.state.dataUpdatedAt)

  for (const query of queries) {
    const result = query.state.data as Partial<SourceLoadResult>
    if (result.source?.id !== sourceId) continue
    const target = createSourceQueryTarget(sourceId, result.source, params)
    if (query.queryHash === getSourceQueryHash(target)) {
      return {
        data: result as SourceLoadResult,
        dataUpdatedAt: query.state.dataUpdatedAt,
      }
    }
  }
}

export function findCachedSourceResult(
  queryClient: QueryClient,
  sourceId: string,
  params: Record<string, unknown> | undefined,
): SourceLoadResult | undefined {
  return findCachedSourceQuery(queryClient, sourceId, params)?.data
}

export function findSourceQueryDataUpdatedAt(
  queryClient: QueryClient,
  data: SourceLoadResult,
): number | undefined {
  let dataUpdatedAt: number | undefined

  for (const query of queryClient.getQueryCache().findAll({ queryKey: SOURCE_QUERY_KEY })) {
    if (
      query.state.data === data
      && (dataUpdatedAt === undefined || query.state.dataUpdatedAt > dataUpdatedAt)
    ) {
      dataUpdatedAt = query.state.dataUpdatedAt
    }
  }

  return dataUpdatedAt
}

function useSourceQueryCacheRestored(): boolean {
  const queryClient = useQueryClient()
  const [restored, setRestored] = useState(false)

  useEffect(() => {
    let active = true
    void restorePersistedSourceQueries(queryClient).finally(() => {
      if (active) setRestored(true)
    })
    return () => {
      active = false
    }
  }, [queryClient])

  return restored
}

export function useCachedSourceResultFinder(): (
  sourceId: string,
  params: Record<string, unknown> | undefined,
) => SourceLoadResult | undefined {
  const queryClient = useQueryClient()
  const cacheRestored = useSourceQueryCacheRestored()
  return useCallback((sourceId, params) => {
    void cacheRestored
    return findCachedSourceResult(queryClient, sourceId, params)
  }, [cacheRestored, queryClient])
}
