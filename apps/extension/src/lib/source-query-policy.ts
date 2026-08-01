export const FETCH_LATEST_PROTECTION_MS = 60_000
export const SOURCE_QUERY_STALE_TIME_MS = 60_000
export const SOURCE_QUERY_REFETCH_INTERVAL_MS = 5 * 60_000
export const SOURCE_QUERY_OFFSCREEN_RETENTION_MS = 60_000
export const SOURCE_QUERY_PRELOAD_MARGIN = "200px"

export function isFetchLatestRateLimited(
  lastFetchedAt: number,
  now: number,
): boolean {
  return now - lastFetchedAt < FETCH_LATEST_PROTECTION_MS
}
