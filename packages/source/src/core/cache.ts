import type {
  SourceCacheConfig,
  SourceCacheMaxAge,
} from "../types"

const SOURCE_CACHE_MAX_AGE_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?[smhd]$/
const SOURCE_CACHE_UNIT_MILLISECONDS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
} as const

export function parseSourceCacheMaxAge(
  value: unknown,
  location = "source cache maxAge",
): number {
  if (typeof value !== "string" || !SOURCE_CACHE_MAX_AGE_PATTERN.test(value)) {
    throw new TypeError(`${location} must be a non-negative duration using s, m, h, or d`)
  }

  const amount = Number(value.slice(0, -1))
  const unit = value.at(-1) as keyof typeof SOURCE_CACHE_UNIT_MILLISECONDS
  const milliseconds = amount * SOURCE_CACHE_UNIT_MILLISECONDS[unit]
  if (!Number.isFinite(milliseconds)) {
    throw new TypeError(`${location} must be a finite duration using s, m, h, or d`)
  }
  return milliseconds
}

export function resolveSourceCacheConfig(
  value: unknown,
  location: string,
): SourceCacheConfig {
  if (typeof value === "string") {
    parseSourceCacheMaxAge(value, location)
    return { version: 1, maxAge: value as SourceCacheMaxAge }
  }
  if (!isRecord(value)) {
    throw new TypeError(`${location} must be a duration or cache configuration object`)
  }
  const unsupportedKey = Object.keys(value).find(key => key !== "version" && key !== "maxAge")
  if (unsupportedKey) {
    throw new TypeError(`${location}.${unsupportedKey} is not supported`)
  }
  const version = value.version
  if (typeof version !== "number" || !Number.isSafeInteger(version) || version < 1) {
    throw new TypeError(`${location}.version must be a positive safe integer`)
  }
  parseSourceCacheMaxAge(value.maxAge, `${location}.maxAge`)

  return {
    version,
    maxAge: value.maxAge as SourceCacheMaxAge,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
