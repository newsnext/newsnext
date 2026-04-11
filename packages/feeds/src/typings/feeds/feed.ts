import type { Color, NewsItem } from "@newsnext/shared/types"
import type { FeedParamSchemaMap, InferFeedParams } from "./params"

/**
 * Category identifier for organizing feeds
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
 * Loader function for a feed
 */
export type FeedLoader<TParams extends FeedParamSchemaMap = FeedParamSchemaMap> = (
  params: InferFeedParams<TParams>,
) => Promise<NewsItem[]>

/**
 * Feed configuration authored inside a provider
 */
export interface FeedRegistration<TParams extends FeedParamSchemaMap = FeedParamSchemaMap> {
  title?: string
  interval?: number
  params?: TParams
  color?: Color
  name?: string
  desc?: string
  type?: "hottest" | "timeline"
  category?: CategoryId
  home?: string
  disable?: boolean
  loader: FeedLoader<TParams>
}

/**
 * Fully-expanded feed definition with provider context
 */
export interface FeedDefinition<TParams extends FeedParamSchemaMap = FeedParamSchemaMap> {
  icon?: string
  name: string
  provider: string
  id: string
  title?: string
  interval: number
  params?: TParams
  color: Color
  desc?: string
  type?: "hottest" | "timeline"
  category: CategoryId
  home?: string
  disable?: boolean
  loader: FeedLoader<TParams>
}

/**
 * Feed definition stored under a provider after defaults are applied
 */
export type RegisteredFeedDefinition<TParams extends FeedParamSchemaMap = FeedParamSchemaMap> = Omit<FeedDefinition<TParams>, "provider">

/**
 * Provider configuration authored in feed definition files.
 */
export interface ProviderRegistration {
  name: string
  color: Color
  icon?: string
  desc?: string
  home?: string
  category?: CategoryId
  feeds: Record<string, FeedRegistration<any>>
}

/**
 * Provider definition after feed defaults are expanded
 */
export interface ProviderDefinition {
  name: string
  color: Color
  icon?: string
  desc?: string
  home?: string
  category: CategoryId
  feeds: Record<string, RegisteredFeedDefinition<any>>
}

/**
 * Public descriptor for feeds exposed to clients
 */
export type FeedDescriptor<TParams extends FeedParamSchemaMap = FeedParamSchemaMap> = Omit<FeedDefinition<TParams>, "loader" | "disable">

/**
 * Map of categories to feed descriptors
 */
export type FeedsByCategory = Record<CategoryId, {
  name: string
  feeds: FeedDescriptor[]
}>
