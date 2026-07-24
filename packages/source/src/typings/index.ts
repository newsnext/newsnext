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

export * from "./sources"
