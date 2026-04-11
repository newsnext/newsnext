/**
 * RSS feed information structure
 */
export interface RSSInfo {
  /**
   * Feed title
   */
  title: string
  /**
   * Feed description
   */
  description: string
  /**
   * Feed link
   */
  link: string
  /**
   * Feed image URL
   */
  image: string
  /**
   * Last update time
   */
  updatedTime: string
  /**
   * RSS feed items
   */
  items: RSSItem[]
}

/**
 * Individual RSS feed item
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
   * Feed title
   */
  title: string
  /**
   * Homepage URL
   */
  home_page_url: string
  /**
   * Feed description
   */
  description: string
  /**
   * Feed items
   */
  items: RSSHubItem[]
}

/**
 * RSSHub feed item
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

export * from "./feeds"
