import type { Color, Either, NewsItem } from "@newsnext/shared/types"
import type { Parameter } from "./params"

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
 * Function that fetches news items from a source
 */
export type SourceFetcher = (params?: any) => Promise<NewsItem[]>

/**
 * Configuration object for defining a new source
 */
export type DefineSource = Partial<Omit<Source, "fetcher" | "namespace" | "id">>
  & {
    /**
     * Display name of the source
     */
    name: string
    /**
     * Theme color for the source
     */
    color: Color
  } & (
    Either<
      {
        /**
         * Sub-sources for sources with multiple variants
         */
        sub: ({
          /**
           * Title of the sub-source
           */
          title: string
          /**
           * Fetcher function for this sub-source
           */
          fetcher: SourceFetcher
        } & (
          Either<{
            /**
             * Default sub-source identifier
             */
            id: "default"
          }, {
            /**
             * Custom sub-source identifier
             */
            id: string
          }>
        ) & Partial<Omit<Source, "name" | "namespace">>
        )[]
      },
      {
        /**
         * Single fetcher for sources without sub-sources
         */
        fetcher: SourceFetcher
      }
    >
  )

/**
 * Complete source definition with all properties
 */
export interface Source {
  /**
   * Icon URL or identifier for the source
   */
  icon?: string
  /**
   * Display name of the source namespace
   */
  name: string
  /**
   * Namespace identifier (auto-generated from filename)
   */
  namespace: string
  /**
   * Unique identifier for the source variant
   */
  id: string
  /**
   * Sub-title or variant name
   */
  title?: string
  /**
   * Refresh interval in milliseconds
   */
  interval: number
  /**
   * Configurable parameters for the source
   */
  params?: Record<string, Parameter>
  /**
   * Theme color for the source
   */
  color: Color
  /**
   * Description of the source
   */
  desc?: string
  /**
   * Type of content provided by the source
   * @default "timeline"
   */
  type?: "hottest" | "timeline"
  /**
   * Category this source belongs to
   */
  category: CategoryId
  /**
   * Homepage URL of the source
   */
  home?: string
  /**
   * Whether this source is disabled
   * @default false
   */
  disable?: boolean
  /**
   * Function to fetch news items from this source
   */
  fetcher: SourceFetcher
}

/**
 * Source definition without namespace (used for defining sources)
 */
export type SourceOptions = Omit<Source, "namespace">

/**
 * Source information without the fetcher function
 */
export type SourceInfo = Omit<Source, "fetcher">

/**
 * Map of categories to their sources
 */
export type SourcesMap = Record<CategoryId, {
  /**
   * Category display name
   */
  name: string
  /**
   * Sources in this category
   */
  sources: SourceInfo[]
}>

/**
 * Source metadata (without fetcher and disable flag)
 */
export type SourceMeta = Omit<Source, "fetcher" | "disable">
