import type { SourceQueryTarget } from "@/lib/source/query-target"
import { queryOptions } from "@tanstack/react-query"
import {
  loadSource,
  SOURCE_QUERY_REFETCH_INTERVAL_MS,
  SOURCE_QUERY_STALE_TIME_MS,
} from "@/lib/source"
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
    queryFn: ({ signal }) => loadSource(target.sourceId, target.params, {
      signal,
      instanceId: target.instanceId,
      remote: target.remote,
    }),
    networkMode: "offlineFirst",
    refetchInterval: SOURCE_QUERY_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    retry: false,
    staleTime: SOURCE_QUERY_STALE_TIME_MS,
  })
}
