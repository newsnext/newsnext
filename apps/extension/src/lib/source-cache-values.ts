import type { SourceCacheMaxAge } from "@newsnext/source/types"
import { stableStringify } from "@newsnext/shared/utils"

export function buildSourceCacheKey(
  sourceId: string,
  version: number,
  params: Record<string, unknown>,
): string {
  return `${sourceId}:v${version}:${stableStringify(params)}`
}

export function parseCacheMaxAge(maxAge: SourceCacheMaxAge): number {
  const value = Number.parseFloat(maxAge.slice(0, -1))
  const unit = maxAge.at(-1)
  const unitMilliseconds = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }[unit ?? ""]

  if (!Number.isFinite(value) || value < 0 || unitMilliseconds === undefined) {
    throw new Error(`Invalid source cache maxAge: ${maxAge}`)
  }

  return value * unitMilliseconds
}
