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

export function findCachedSourceResult(
  queryClient: QueryClient,
  sourceId: string,
  params: Record<string, unknown> | undefined,
): SourceLoadResult | undefined {
  const queries = queryClient.getQueryCache()
    .findAll({ queryKey: SOURCE_QUERY_KEY })
    .filter(query => query.state.data !== undefined)
    .toSorted((left, right) => right.state.dataUpdatedAt - left.state.dataUpdatedAt)

  for (const query of queries) {
    const result = query.state.data as Partial<SourceLoadResult>
    if (result.source?.id !== sourceId) continue
    const target = createSourceQueryTarget(sourceId, result.source, params)
    if (query.queryHash === getSourceQueryHash(target)) {
      return result as SourceLoadResult
    }
  }
}

function useSourceQueryCacheRevision(): number {
  const queryClient = useQueryClient()
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let active = true
    void restorePersistedSourceQueries(queryClient).finally(() => {
      if (active) setRevision(current => current + 1)
    })
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      setRevision(current => current + 1)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [queryClient])

  return revision
}

export function useCachedSourceResultFinder(): (
  sourceId: string,
  params: Record<string, unknown> | undefined,
) => SourceLoadResult | undefined {
  const queryClient = useQueryClient()
  const revision = useSourceQueryCacheRevision()
  return useCallback((sourceId, params) => {
    void revision
    return findCachedSourceResult(queryClient, sourceId, params)
  }, [queryClient, revision])
}
