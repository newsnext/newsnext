export const SOURCE_REQUEST_PROTECTION_MS = 60_000
export const FETCH_LATEST_MINIMUM_FEEDBACK_MS = 500
export const SOURCE_QUERY_STALE_TIME_MS = 2 * 60_000
export const SOURCE_QUERY_REFETCH_INTERVAL_MS = 5 * 60_000
export const SOURCE_QUERY_OFFSCREEN_RETENTION_MS = 60_000
export const SOURCE_QUERY_PRELOAD_MARGIN = "200px"

export function isSourceRequestProtected(
  fetchedAt: number,
  now = Date.now(),
): boolean {
  return now - fetchedAt < SOURCE_REQUEST_PROTECTION_MS
}
