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
export interface SourceCookieSecretDefinition {
  key: string
  type: "cookie"
  url: string
  name: string
  required?: boolean
}

export interface SourceLocalStorageSecretDefinition {
  key: string
  type: "localStorage"
  origin: string
  itemKey: string
  cache?: boolean
  required?: boolean
}

export type SourceSecretDefinition = SourceCookieSecretDefinition | SourceLocalStorageSecretDefinition

export type SourceSecrets = Record<string, string | undefined>

export interface SourceSecretHttpTransformRequest {
  url?: string
  method?: "GET" | "POST"
  credentials?: "include" | "omit" | "same-origin"
  headers?: Record<string, string | undefined>
  body?: Record<string, unknown> | string
}

export interface SourceSecretHttpTransformDefinition {
  type: "http"
  targetKey: string
  url: string
  method?: "GET" | "POST"
  credentials?: "include" | "omit" | "same-origin"
  request?: (secrets: SourceSecrets) => SourceSecretHttpTransformRequest | undefined
  output: {
    type: "header" | "json"
    key: string
  }
  when?: "missing" | "always"
}

export type SourceSecretTransformDefinition = SourceSecretHttpTransformDefinition

export interface SourceLoaderContext {
  secrets?: SourceSecrets
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
  color?: Color
  providerTitle?: string
  desc?: string
  type?: "hottest" | "timeline"
  category?: CategoryId
  home?: string
  secrets?: SourceSecretDefinition[]
  secretTransforms?: SourceSecretTransformDefinition[]
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
  color: Color
  desc?: string
  type?: "hottest" | "timeline"
  category: CategoryId
  home?: string
  secrets?: SourceSecretDefinition[]
  secretTransforms?: SourceSecretTransformDefinition[]
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
  secretTransforms?: SourceSecretTransformDefinition[]
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
export interface SourceDescriptor<TParams extends SourceParamSchemaMap = SourceParamSchemaMap> extends Omit<SourceDefinition<TParams>, "provider" | "key" | "loader" | "secretTransforms" | "disable"> {
  id: string
}

/**
 * Map of categories to source descriptors
 */
export type SourcesByCategory = Record<CategoryId, {
  key: string
  sources: SourceDescriptor[]
}>
