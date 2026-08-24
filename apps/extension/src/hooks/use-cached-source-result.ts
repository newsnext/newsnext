import type { QueryClient } from "@tanstack/react-query"
import type { SourceLoadResponse, SourceLoadResult } from "@/lib/source/load-result"
import { useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import {
  createInstanceQueryTarget,
  createSourceQueryTarget,
  getSourceQueryHash,
  getSourceQueryKey,
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

function readCachedSourceQuery(
  value: unknown,
  sourceId: string,
): CachedSourceQuery | undefined {
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

export function findCachedInstanceQuery(
  queryClient: QueryClient,
  instanceId: string,
  sourceId: string,
): CachedSourceQuery | undefined {
  return readCachedSourceQuery(
    queryClient.getQueryData(
      getSourceQueryKey(createInstanceQueryTarget(instanceId)),
    ),
    sourceId,
  )
}

export function findCachedSourceQuery(
  queryClient: QueryClient,
  sourceId: string,
  params: Record<string, unknown> | undefined,
): CachedSourceQuery | undefined {
  const queries = queryClient.getQueryCache()
    .findAll({ queryKey: SOURCE_QUERY_KEY })
    .filter(query => query.state.data !== undefined)

  for (const query of queries) {
    const cached = readCachedSourceQuery(query.state.data, sourceId)
    if (!cached) continue
    const target = createSourceQueryTarget(sourceId, cached.data.source, params)
    if (query.queryHash === getSourceQueryHash(target)) {
      return cached
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

export function useCachedInstanceResultFinder(): (
  instanceId: string,
  sourceId: string,
) => SourceLoadResult | undefined {
  const queryClient = useQueryClient()
  return useCallback((instanceId, sourceId) => {
    return findCachedInstanceQuery(queryClient, instanceId, sourceId)?.data
  }, [queryClient])
}
