import { SOURCE_REGISTRY_LIMITS } from "../core/limits"

const REGISTRY_SOURCE_ID_PATTERN = /^[^:\s]+:[^:\s]+$/
const PROHIBITED_REGISTRY_KEYS = new Set(["__proto__", "constructor", "prototype"])
const STRUCTURED_LOADER_TYPES = new Set(["html", "json", "rss"])

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function isValidIdSegment(value: string): boolean {
  return Boolean(value) && !/[:\s]/.test(value) && !PROHIBITED_REGISTRY_KEYS.has(value)
}

export function isStructuredLoaderType(value: unknown): boolean {
  return STRUCTURED_LOADER_TYPES.has(String(value))
}

export function parseRegistrySourceId(id: string): [string, string] {
  const parts = id.split(":")
  if (
    id.length > SOURCE_REGISTRY_LIMITS.maxSourceIdLength
    || !REGISTRY_SOURCE_ID_PATTERN.test(id)
    || parts.some(part => PROHIBITED_REGISTRY_KEYS.has(part))
  ) {
    throw new Error(`Invalid registry source ID "${id}"`)
  }

  return [parts[0] as string, parts[1] as string]
}
