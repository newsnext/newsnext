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
export type SourceLoader<TParams extends SourceParamSchemaMap = SourceParamSchemaMap> = (
  params: InferSourceParams<TParams>,
) => Promise<NewsItem[]>

/**
 * Source configuration authored inside a provider
 */
export interface SourceRegistration<TParams extends SourceParamSchemaMap = SourceParamSchemaMap> {
  title?: string
  maxCacheAge?: number
  params?: TParams
  color?: Color
  name?: string
  desc?: string
  type?: "hottest" | "timeline"
  category?: CategoryId
  home?: string
  disable?: boolean
  loader: SourceLoader<TParams>
}

/**
 * Fully-expanded source definition with provider context
 */
export interface SourceDefinition<TParams extends SourceParamSchemaMap = SourceParamSchemaMap> {
  icon?: string
  name: string
  provider: string
  id: string
  title?: string
  maxCacheAge: number
  params?: TParams
  color: Color
  desc?: string
  type?: "hottest" | "timeline"
  category: CategoryId
  home?: string
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
  name: string
  color: Color
  icon?: string
  desc?: string
  home?: string
  category?: CategoryId
  sources: Record<string, SourceRegistration<any>>
}

/**
 * Provider definition after source defaults are expanded
 */
export interface ProviderDefinition {
  name: string
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
export type SourceDescriptor<TParams extends SourceParamSchemaMap = SourceParamSchemaMap> = Omit<SourceDefinition<TParams>, "loader" | "disable">

/**
 * Map of categories to source descriptors
 */
export type SourcesByCategory = Record<CategoryId, {
  name: string
  sources: SourceDescriptor[]
}>
