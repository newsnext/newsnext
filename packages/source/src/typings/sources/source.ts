import type { Color, NewsItem } from "@newsnext/shared/types"
import type { Browser } from "@wxt-dev/browser"
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

export interface SourceRadarMatch {
  hosts: string[]
  paths?: string[]
  includes?: string | string[]
}

export type SourceRadarParams = Record<string, string>

export interface SourceRadarMetadata {
  title?: string
  icon?: string
  desc?: string
  home?: string
  color?: string
}

export interface SourcePatch<TParams = SourceRadarParams, TMetadata = SourceRadarMetadata> {
  params?: TParams
  metadata?: TMetadata
}

export type SourceRadarPatch = SourcePatch

export interface SourceRadarRule {
  id: string
  match: SourceRadarMatch
  patch?: SourceRadarPatch
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
  icon?: string
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

export interface SourceProvider {
  title: string
}

export type SourceTemplateContextValue
  = | boolean
    | null
    | number
    | string
    | readonly SourceTemplateContextValue[]
    | { readonly [key: string]: SourceTemplateContextValue }

export type SourceTemplateContext = Readonly<Record<string, SourceTemplateContextValue>>

export type SourceRequestRule = Omit<Browser.declarativeNetRequest.Rule, "id">

export type SourceCacheMaxAge = `${number}${"s" | "m" | "h" | "d"}`

export interface SourceCacheConfig {
  version: number
  maxAge: SourceCacheMaxAge
}

export interface RuntimeSource<TParams extends SourceParamSchemaMap = SourceParamSchemaMap> {
  provider: SourceProvider
  key: string
  title?: string
  params?: TParams
  capabilities: SourceCapabilities
  cache: SourceCacheConfig
  icon?: string
  desc?: string
  type?: "hottest" | "timeline"
  home?: string
  secrets?: SourceSecretDefinition[]
  radar?: SourceRadarRule[]
  requestRules?: readonly SourceRequestRule[]
  disable?: boolean
  loader: SourceLoader<TParams>
  color: Color
  category: CategoryId
}

/**
 * Provider definition after source defaults are expanded
 */
export interface ProviderDefinition {
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
