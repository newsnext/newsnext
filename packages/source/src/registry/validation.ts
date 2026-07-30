import type { SourceProvider } from "../types"
import { COLORS } from "@newsnext/shared/constants"
import { SOURCE_REGISTRY_LIMITS } from "../core/limits"
import { CATEGORY_IDS } from "../types"

const REGISTRY_SOURCE_ID_PATTERN = /^[^:\s]+:[^:\s]+$/
const PROHIBITED_REGISTRY_KEYS = new Set(["__proto__", "constructor", "prototype"])
const SOURCE_PROVIDER_KEYS = new Set(["category", "color", "icon", "title"])
const PROVIDER_CONFIG_KEYS = new Set([...SOURCE_PROVIDER_KEYS, "defaults", "sources"])
const STRUCTURED_LOADER_TYPES = new Set(["html", "json", "rss"])
const SOURCE_COLORS = new Set<string>(COLORS)
const SOURCE_CATEGORIES: ReadonlySet<string> = new Set(CATEGORY_IDS)

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function isValidIdSegment(value: string): boolean {
  return Boolean(value) && !/[:\s]/.test(value) && !PROHIBITED_REGISTRY_KEYS.has(value)
}

export function hasValidSourceProviderMetadata(value: unknown): value is SourceProvider {
  return isRecord(value)
    && typeof value.title === "string"
    && value.title.trim().length > 0
    && (value.category === undefined || isSourceCategory(value.category))
    && (value.icon === undefined || typeof value.icon === "string")
    && isSourceColor(value.color)
}

export function isSourceProvider(value: unknown): value is SourceProvider {
  return hasValidSourceProviderMetadata(value)
    && Object.keys(value).every(key => SOURCE_PROVIDER_KEYS.has(key))
}

export function isStructuredLoaderType(value: unknown): boolean {
  return STRUCTURED_LOADER_TYPES.has(String(value))
}

export function isSupportedProviderKey(value: string): boolean {
  return PROVIDER_CONFIG_KEYS.has(value)
}

export function isSourceColor(value: unknown): boolean {
  return SOURCE_COLORS.has(String(value))
}

export function isSourceCategory(value: unknown): boolean {
  return SOURCE_CATEGORIES.has(String(value))
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
