import type { QueryClient } from "@tanstack/react-query"
import type { SourceLoadResult } from "@/lib/source"
import type { SourceQueryTarget } from "@/lib/source/query-target"
import { queryOptions } from "@tanstack/react-query"
import {
  isSourceRequestProtected,
  loadSource,
  SOURCE_QUERY_REFETCH_INTERVAL_MS,
  SOURCE_QUERY_STALE_TIME_MS,
} from "@/lib/source"
import { sourceQueryPersister } from "@/lib/source/query-persister"
import { getSourceQueryKey } from "@/lib/source/query-target"

export type { SourceQueryTarget } from "@/lib/source/query-target"
export {
  createSourceQueryTarget,
  getSourceQueryHash,
  getSourceQueryKey,
  SOURCE_QUERY_KEY,
} from "@/lib/source/query-target"

export function getSourceQueryOptions(
  target: SourceQueryTarget,
) {
  return queryOptions({
    queryKey: getSourceQueryKey(target),
    queryFn: ({ signal }) => loadSource(target.sourceId, target.params, { signal }),
    networkMode: "offlineFirst",
    persister: sourceQueryPersister.persisterFn,
    refetchInterval: SOURCE_QUERY_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    retry: false,
    staleTime: SOURCE_QUERY_STALE_TIME_MS,
  })
}

export async function fetchLatestSourceQuery(
  queryClient: QueryClient,
  target: SourceQueryTarget,
): Promise<SourceLoadResult> {
  const queryKey = getSourceQueryKey(target)
  const state = queryClient.getQueryState<SourceLoadResult>(queryKey)
  if (
    state?.data !== undefined
    && isSourceRequestProtected(state.dataUpdatedAt)
  ) {
    return state.data
  }

  await queryClient.cancelQueries({ queryKey, exact: true })
  return queryClient.fetchQuery({
    ...getSourceQueryOptions(target),
    staleTime: 0,
  })
}
