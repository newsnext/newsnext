import type { QueryClient } from "@tanstack/react-query"
import type { SourceLoadResponse, SourceLoadResult } from "@/lib/source/load-result"
import { useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import {
  createSourceQueryTarget,
  getSourceQueryHash,
  SOURCE_QUERY_KEY,
} from "@/hooks/source-query"

export interface CachedSourceQuery {
  data: SourceLoadResult
  loadedAt: number
}

function getSourceLoadResponse(
  value: unknown,
): Partial<SourceLoadResponse> | undefined {
  if (typeof value !== "object" || value === null) return undefined
  return value
}

export function findCachedSourceQuery(
  queryClient: QueryClient,
  sourceId: string,
  params: Record<string, unknown> | undefined,
  instanceId?: string,
): CachedSourceQuery | undefined {
  const queries = queryClient.getQueryCache()
    .findAll({ queryKey: SOURCE_QUERY_KEY })
    .filter(query => query.state.data !== undefined)

  for (const query of queries) {
    const response = getSourceLoadResponse(query.state.data)
    const result = response?.result
    if (
      !result
      || result.source?.id !== sourceId
      || typeof response.loadedAt !== "number"
    ) {
      continue
    }
    const target = createSourceQueryTarget(sourceId, result.source, params, instanceId)
    if (query.queryHash === getSourceQueryHash(target)) {
      return {
        data: result,
        loadedAt: response.loadedAt,
      }
    }
  }
}

export function findCachedSourceResult(
  queryClient: QueryClient,
  sourceId: string,
  params: Record<string, unknown> | undefined,
  instanceId?: string,
): SourceLoadResult | undefined {
  return findCachedSourceQuery(queryClient, sourceId, params, instanceId)?.data
}

export function useCachedSourceResultFinder(): (
  sourceId: string,
  params: Record<string, unknown> | undefined,
  instanceId?: string,
) => SourceLoadResult | undefined {
  const queryClient = useQueryClient()
  return useCallback((sourceId, params, instanceId) => {
    return findCachedSourceResult(queryClient, sourceId, params, instanceId)
  }, [queryClient])
}
