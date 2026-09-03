export const SOURCE_REGISTRIES_CACHE_KEY = "source-registries"
export const SOURCE_REGISTRIES_REFRESH_KEY = "source-registries-refresh"
export const SOURCE_REGISTRIES_STATE_KEY = "source-registries-state"

export type SourceRegistryStatus = "error" | "ready" | "stale"

export interface SourceRegistryStateEntry {
  checkedAt: number
  sourceIds: string[]
  status: SourceRegistryStatus
  url: string
  error?: string
  updatedAt?: number
}

export function parseSourceRegistryState(value: unknown): SourceRegistryStateEntry[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((candidate) => {
    if (!isRecord(candidate)
      || typeof candidate.url !== "string"
      || typeof candidate.checkedAt !== "number"
      || !Number.isFinite(candidate.checkedAt)
      || !Array.isArray(candidate.sourceIds)
      || !candidate.sourceIds.every(id => typeof id === "string")
      || (candidate.status !== "ready" && candidate.status !== "stale" && candidate.status !== "error")) {
      return []
    }

    return [{
      checkedAt: candidate.checkedAt,
      error: typeof candidate.error === "string" ? candidate.error : undefined,
      sourceIds: candidate.sourceIds,
      status: candidate.status,
      updatedAt: typeof candidate.updatedAt === "number" && Number.isFinite(candidate.updatedAt)
        ? candidate.updatedAt
        : undefined,
      url: candidate.url,
    }]
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}
