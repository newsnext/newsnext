import type { Color, NewsItem, SourceType } from "@newsnext/shared/types"

export type { NewsItem, SourceType }

/**
 * Sub-source definition for extension sources
 */
export interface SubSource {
  /**
   * Display title for the sub-source
   */
  title: string
  /**
   * Handler function to fetch news items
   */
  handler: SourceHandler
  /**
   * Whether this is the default sub-source
   */
  default?: boolean
  /**
   * Theme color override
   */
  color?: Color
  /**
   * Source type override
   */
  type?: SourceType
  /**
   * Language code
   */
  lang?: string
  /**
   * Description
   */
  desc?: string
  /**
   * Homepage URL
   */
  home?: string
}

/**
 * Source definition for extension sources
 */
export interface Source {
  /**
   * Display name of the source
   */
  name: string
  /**
   * Language code
   */
  lang?: string
  /**
   * Refresh interval in milliseconds
   */
  interval: number
  /**
   * Theme color
   */
  color: Color
  /**
   * Sub-title
   */
  title?: string
  /**
   * Description
   */
  desc?: string
  /**
   * Source type
   */
  type?: SourceType
  /**
   * Homepage URL
   */
  home?: string
  /**
   * Namespace identifier
   */
  namespace: string
  /**
   * Sub-sources
   */
  sub?: Record<string, SubSource>
}

/**
 * Helper function to define a source with type safety
 */
export function defineSource(source: Source): Source {
  return source
}

/**
 * Handler function type for fetching news items
 */
export type SourceHandler = () => Promise<NewsItem[]>

/**
 * Helper function to define a source handler with type safety
 */
export function defineSourceHandler(handler: SourceHandler): SourceHandler {
  return handler
}