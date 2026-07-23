/**
 * RSS source information structure
 */
export interface RSSInfo {
  /**
   * Source title
   */
  title: string
  /**
   * Source description
   */
  description: string
  /**
   * Source link
   */
  link: string
  /**
   * Source image URL
   */
  image: string
  /**
   * Last update time
   */
  updatedTime: string
  /**
   * RSS source items
   */
  items: RSSItem[]
}

/**
 * Individual RSS source item
 */
export interface RSSItem {
  /**
   * Item title
   */
  title: string
  /**
   * Item description
   */
  description: string
  /**
   * Item link
   */
  link: string
  /**
   * Creation timestamp
   */
  created?: string
}

/**
 * RSSHub API response structure
 */
export interface RSSHubResponse {
  /**
   * Source title
   */
  title: string
  /**
   * Homepage URL
   */
  home_page_url: string
  /**
   * Source description
   */
  description: string
  /**
   * Source items
   */
  items: RSSHubItem[]
}

/**
 * RSSHub source item
 */
export interface RSSHubItem {
  /**
   * Unique item identifier
   */
  id: string
  /**
   * Item URL
   */
  url: string
  /**
   * Item title
   */
  title: string
  /**
   * HTML content
   */
  content_html: string
  /**
   * Publication date
   */
  date_published: string
}

/**
 * Options for RSSHub fetcher
 */
export interface RSSHubOption {
  /**
   * Whether to sort items by date
   * @default true
   */
  sorted?: boolean
  /**
   * Maximum number of items to return
   * @default 20
   */
  limit?: number
}

export * from "./sources"
