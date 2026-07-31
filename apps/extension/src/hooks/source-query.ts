import type { QueryClient } from "@tanstack/react-query"
import type { SourceLoadResult } from "@/lib/source-loader"
import { hashKey } from "@tanstack/react-query"
import { loadSource } from "@/lib/source-loader"

export const SOURCE_QUERY_KEY = ["source"] as const
export const SOURCE_QUERY_INTERVAL = 60_000

export interface SourceQueryTarget {
  sourceId: string
  params?: Record<string, unknown>
}

export function getSourceQueryKey(
  target: SourceQueryTarget,
): readonly ["source", string, Record<string, unknown>] {
  return [...SOURCE_QUERY_KEY, target.sourceId, target.params ?? {}] as const
}

export function getSourceQueryHash(target: SourceQueryTarget): string {
  return hashKey(getSourceQueryKey(target))
}

export function loadSourceQuery(
  queryClient: QueryClient,
  target: SourceQueryTarget,
  forceFresh = false,
): Promise<SourceLoadResult> {
  const queryKey = getSourceQueryKey(target)

  return loadSource(target.sourceId, target.params, {
    forceFresh,
    onCachedResult: result => queryClient.setQueryData(queryKey, result),
  })
}

export async function refreshSourceQuery(
  queryClient: QueryClient,
  target: SourceQueryTarget,
): Promise<SourceLoadResult> {
  const queryKey = getSourceQueryKey(target)

  await queryClient.cancelQueries({ queryKey, exact: true })
  return queryClient.fetchQuery({
    queryKey,
    queryFn: () => loadSourceQuery(queryClient, target, true),
    staleTime: 0,
  })
}
