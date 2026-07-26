import type { Color, NewsItem } from "@newsnext/shared/types"
import type { InferSourceParams, SourceParamSchemaMap } from "./params"

/**
 * Category identifier for organizing sources
 */
export type CategoryId = "tech" | "finance" | "china" | "world" | "others"

/**
 * Human-readable category names
 */
export const categories: Record<CategoryId, string> = {
  tech: "Technology",
  finance: "Finance & Economics",
  china: "China",
  world: "International",
  others: "Others",
}

/**
 * Loader function for a source
 */
export interface SourceSecretBaseDefinition {
  key: string
  origin: string
  itemKey: string
  cache?: boolean
  required?: boolean
}

export interface SourceCookieSecretDefinition extends SourceSecretBaseDefinition {
  type: "cookie"
}

export interface SourceLocalStorageSecretDefinition extends SourceSecretBaseDefinition {
  type: "localStorage"
}

export type SourceSecretDefinition = SourceCookieSecretDefinition | SourceLocalStorageSecretDefinition

export type SourceSecrets = Record<string, string | undefined>

export type SourceRadarValue
  = | { type: "literal", value: unknown }
    | { type: "path", name: string }
    | { type: "query", name: string }
    | { type: "hashQuery", name: string }
    | { type: "pathSegmentWithPrefix", prefix: string }
    | { type: "first", values: SourceRadarValue[] }
    | { type: "pageTitle" }

export type SourceRadarTransform
  = | { type: "normalizeWhitespace" }
    | { type: "replace", pattern: string, replacement: string }
    | { type: "extract", pattern: string, group?: number, fallbackToEmpty?: boolean }
    | { type: "prepend", value: string }
    | { type: "template", value: string }

export interface SourceRadarPatchValue {
  value: SourceRadarValue
  transforms?: SourceRadarTransform[]
  fallback?: unknown
}

export interface SourceRadarMatch {
  hosts: string[]
  paths?: string[]
  includes?: string | string[]
}

export type SourceRadarParamPatch = Record<string, SourceRadarValue | SourceRadarPatchValue>

export interface SourceRadarMetaPatch {
  providerTitle?: string | SourceRadarPatchValue
  title?: string | SourceRadarPatchValue
  desc?: string | SourceRadarPatchValue
  home?: string | SourceRadarPatchValue
  color?: Color | SourceRadarPatchValue
}

export interface SourceRadarRule {
  id: string
  match: SourceRadarMatch
  paramsPatch?: SourceRadarParamPatch
  metaPatch?: SourceRadarMetaPatch
  confidence?: number
}

export interface SourceLoaderContext {
  secrets?: SourceSecrets
  updateSecrets?: (secrets: SourceSecrets) => Promise<void>
}

export type SourceLoader<TParams extends SourceParamSchemaMap = SourceParamSchemaMap> = (
  params: InferSourceParams<TParams>,
  context?: SourceLoaderContext,
) => Promise<NewsItem[]>

export interface SourceMetadata {
  key: string
  title?: string
  providerTitle?: string
  sourceIcon?: string
  desc?: string
  type?: "hottest" | "timeline"
  category?: CategoryId
  home?: string
  color?: Color
}

export interface SourceCapabilities {
  network: readonly string[]
  cookies: readonly string[]
  browser: readonly string[]
}

export type SourceCacheMaxAge = `${number}${"s" | "m" | "h" | "d"}`

export interface SourceCacheConfig {
  version: number
  maxAge: SourceCacheMaxAge
}

export interface RuntimeSource<TParams extends SourceParamSchemaMap = SourceParamSchemaMap> {
  key: string
  title?: string
  params?: TParams
  capabilities: SourceCapabilities
  cache: SourceCacheConfig
  sourceIcon?: string
  desc?: string
  type?: "hottest" | "timeline"
  home?: string
  secrets?: SourceSecretDefinition[]
  radar?: SourceRadarRule[]
  disable?: boolean
  loader: SourceLoader<TParams>
  icon?: string
  providerTitle: string
  color: Color
  category: CategoryId
}

/**
 * Provider definition after source defaults are expanded
 */
export interface ProviderDefinition {
  id: string
  title: string
  color: Color
  icon?: string
  desc?: string
  home?: string
  category: CategoryId
  sources: Record<string, RuntimeSource<any>>
}

/**
 * Public descriptor for sources exposed to clients
 */
export type SourceDescriptor<TParams extends SourceParamSchemaMap = SourceParamSchemaMap>
  = Omit<RuntimeSource<TParams>, "key" | "loader" | "disable"> & {
    id: string
  }

/**
 * Map of categories to source descriptors
 */
export type SourcesByCategory = Record<CategoryId, {
  key: string
  sources: SourceDescriptor[]
}>
