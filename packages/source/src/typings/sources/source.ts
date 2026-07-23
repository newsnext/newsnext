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

/**
 * Source configuration authored inside a provider
 */
export interface SourceRegistration<TParams extends SourceParamSchemaMap = SourceParamSchemaMap> {
  key: string
  title?: string
  params?: TParams
  paramsSchemaVersion?: number
  cacheVersion?: number
  color?: Color
  providerTitle?: string
  desc?: string
  type?: "hottest" | "timeline"
  category?: CategoryId
  home?: string
  secrets?: SourceSecretDefinition[]
  radar?: SourceRadarRule[]
  disable?: boolean
  loader: SourceLoader<TParams>
}

/**
 * Fully-expanded source definition with provider context
 */
export interface SourceDefinition<TParams extends SourceParamSchemaMap = SourceParamSchemaMap> {
  icon?: string
  providerTitle: string
  provider: string
  key: string
  title?: string
  params?: TParams
  paramsSchemaVersion?: number
  cacheVersion?: number
  color: Color
  desc?: string
  type?: "hottest" | "timeline"
  category: CategoryId
  home?: string
  secrets?: SourceSecretDefinition[]
  radar?: SourceRadarRule[]
  disable?: boolean
  loader: SourceLoader<TParams>
}

/**
 * Source definition stored under a provider after defaults are applied
 */
export type RegisteredSourceDefinition<TParams extends SourceParamSchemaMap = SourceParamSchemaMap> = Omit<SourceDefinition<TParams>, "provider">

/**
 * Provider configuration authored in source definition files.
 */
export interface ProviderRegistration {
  id?: string
  title: string
  color: Color
  icon?: string
  desc?: string
  home?: string
  category?: CategoryId
  secrets?: SourceSecretDefinition[]
  sources: SourceRegistration<any>[]
}

/**
 * Provider definition after source defaults are expanded
 */
export interface ProviderDefinition {
  id?: string
  title: string
  color: Color
  icon?: string
  desc?: string
  home?: string
  category: CategoryId
  sources: Record<string, RegisteredSourceDefinition<any>>
}

/**
 * Public descriptor for sources exposed to clients
 */
export interface SourceDescriptor<TParams extends SourceParamSchemaMap = SourceParamSchemaMap> extends Omit<SourceDefinition<TParams>, "provider" | "key" | "loader" | "disable"> {
  id: string
}

/**
 * Map of categories to source descriptors
 */
export type SourcesByCategory = Record<CategoryId, {
  key: string
  sources: SourceDescriptor[]
}>
