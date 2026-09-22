import type { SourceQueryTarget } from "@/lib/source/query-target"
import { queryOptions } from "@tanstack/react-query"
import {
  loadLiveCard,
  loadSource,
  readLiveCardSnapshot,
  SOURCE_QUERY_REFETCH_INTERVAL_MS,
  SOURCE_QUERY_STALE_TIME_MS,
} from "@/lib/source"
import { getSourceQueryKey } from "@/lib/source/query-target"

export type { SourceQueryTarget } from "@/lib/source/query-target"
const LIVE_CARD_SNAPSHOT_QUERY_KEY = ["live-card-snapshot"] as const

export function getLiveCardSnapshotQueryKey(cardId: string) {
  return [...LIVE_CARD_SNAPSHOT_QUERY_KEY, cardId] as const
}

export function getLiveCardSnapshotQueryOptions(cardId: string) {
  return queryOptions({
    gcTime: 0,
    queryKey: getLiveCardSnapshotQueryKey(cardId),
    queryFn: ({ signal }) => readLiveCardSnapshot(cardId, signal),
    networkMode: "offlineFirst",
    retry: false,
    // One repository read initializes all active observers. Successful refreshes
    // replace it explicitly; inactive snapshots are discarded and read again.
    staleTime: Infinity,
  })
}

export function getLiveCardSnapshotMetadataQueryOptions(cardId: string) {
  return queryOptions({
    ...getLiveCardSnapshotQueryOptions(cardId),
    select: snapshot => snapshot?.result.metadata,
  })
}

export {
  createLiveCardQueryTarget,
  createSourceQueryTarget,
  getSourceQueryHash,
  getSourceQueryKey,
  LIVE_CARD_QUERY_KEY,
  SOURCE_QUERY_KEY,
} from "@/lib/source/query-target"

export function getSourceQueryOptions(
  target: SourceQueryTarget,
) {
  return queryOptions({
    queryKey: getSourceQueryKey(target),
    queryFn: ({ signal }) => "cardId" in target
      ? loadLiveCard(target.cardId, signal)
      : loadSource(target.sourceId, target.params, signal),
    networkMode: "offlineFirst",
    refetchInterval: SOURCE_QUERY_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    // Never retry source loads: retries would bypass request protection and hammer failing origins.
    retry: false,
    staleTime: SOURCE_QUERY_STALE_TIME_MS,
  })
}
