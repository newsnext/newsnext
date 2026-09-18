/**
 * Shared HTTP request policy for Source loading and `client.fetch`.
 * Both paths use the same per-attempt timeout, retry budget, and per-host
 * request spacing; keep them here so the two runtimes cannot drift apart.
 */
export const SOURCE_HOST_REQUEST_INTERVAL_MS = 500
export const SOURCE_REQUEST_RETRY_COUNT = 3
export const SOURCE_REQUEST_TIMEOUT_MS = 10_000
