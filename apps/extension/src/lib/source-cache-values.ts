import { stableStringify } from "@newsnext/shared/utils"

export const SOURCE_CACHE_MAX_ENTRIES = 500
export const SOURCE_CACHE_MAX_BYTES = 50 * 1024 * 1024
export const SOURCE_CACHE_MAX_UNUSED_AGE_MS = 30 * 24 * 60 * 60 * 1000

export interface SourceCacheUsage {
  key: string
  size: number
  usedAt: number
}

export function buildSourceCacheKey(
  sourceId: string,
  version: number,
  params: Record<string, unknown>,
): string {
  return `${sourceId}:v${version}:${stableStringify(params)}`
}

export function selectSourceCacheKeysToDelete(
  entries: readonly SourceCacheUsage[],
  now: number,
  maxEntries = SOURCE_CACHE_MAX_ENTRIES,
  maxUnusedAgeMs = SOURCE_CACHE_MAX_UNUSED_AGE_MS,
  maxBytes = SOURCE_CACHE_MAX_BYTES,
): string[] {
  const expiredKeys = new Set(
    entries
      .filter(entry => (
        !Number.isFinite(entry.usedAt)
        || !Number.isFinite(entry.size)
        || entry.size < 0
        || now - entry.usedAt >= maxUnusedAgeMs
      ))
      .map(entry => entry.key),
  )
  const versionedEntries = entries.map(entry => ({
    entry,
    versionedKey: parseVersionedSourceCacheKey(entry.key),
  }))
  const newestVersions = new Map<string, number>()
  for (const { versionedKey } of versionedEntries) {
    if (versionedKey) {
      newestVersions.set(
        versionedKey.identity,
        Math.max(newestVersions.get(versionedKey.identity) ?? 0, versionedKey.version),
      )
    }
  }
  for (const { entry, versionedKey } of versionedEntries) {
    if (
      versionedKey
      && versionedKey.version < (newestVersions.get(versionedKey.identity) ?? versionedKey.version)
    ) {
      expiredKeys.add(entry.key)
    }
  }

  const retainedEntries = entries
    .filter(entry => !expiredKeys.has(entry.key))
    .sort((left, right) => right.usedAt - left.usedAt)
  let retainedBytes = 0
  let retainedCount = 0

  for (const entry of retainedEntries) {
    if (retainedCount >= Math.max(0, maxEntries) || retainedBytes + entry.size > maxBytes) {
      expiredKeys.add(entry.key)
      continue
    }
    retainedCount += 1
    retainedBytes += entry.size
  }

  return [...expiredKeys]
}

interface VersionedSourceCacheKey {
  identity: string
  version: number
}

function parseVersionedSourceCacheKey(key: string): VersionedSourceCacheKey | undefined {
  const match = /^([^:]+:[^:]+):v(\d+):([\s\S]*)$/.exec(key)
  if (!match) return

  return {
    identity: `${match[1]}:${match[3]}`,
    version: Number(match[2]),
  }
}
