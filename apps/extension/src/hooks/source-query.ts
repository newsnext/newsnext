import type { QueryClient } from "@tanstack/react-query"
import type { SourceLoadResult } from "@/lib/source-loader"
import { hashKey, queryOptions } from "@tanstack/react-query"
import { loadSource } from "@/lib/source-loader"
import {
  SOURCE_QUERY_REFETCH_INTERVAL_MS,
  SOURCE_QUERY_STALE_TIME_MS,
} from "@/lib/source-query-policy"

export const SOURCE_QUERY_KEY = ["source"] as const

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

function loadSourceQuery(
  queryClient: QueryClient,
  target: SourceQueryTarget,
  fetchLatest = false,
  signal?: AbortSignal,
): Promise<SourceLoadResult> {
  const queryKey = getSourceQueryKey(target)

  return loadSource(target.sourceId, target.params, {
    fetchLatest,
    onCachedResult: result => queryClient.setQueryData(queryKey, result),
    signal,
  })
}

export function getSourceQueryOptions(
  queryClient: QueryClient,
  target: SourceQueryTarget,
  fetchLatest = false,
): ReturnType<typeof queryOptions<
  SourceLoadResult,
  Error,
  SourceLoadResult,
  ReturnType<typeof getSourceQueryKey>
>> {
  return queryOptions({
    queryKey: getSourceQueryKey(target),
    queryFn: ({ signal }) => loadSourceQuery(queryClient, target, fetchLatest, signal),
    networkMode: "offlineFirst",
    staleTime: fetchLatest ? 0 : SOURCE_QUERY_STALE_TIME_MS,
    refetchInterval: SOURCE_QUERY_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: true,
    retry: false,
  })
}

export async function fetchLatestSourceQuery(
  queryClient: QueryClient,
  target: SourceQueryTarget,
): Promise<SourceLoadResult> {
  const queryKey = getSourceQueryKey(target)

  await queryClient.cancelQueries({ queryKey, exact: true })
  return queryClient.fetchQuery(getSourceQueryOptions(queryClient, target, true))
}
