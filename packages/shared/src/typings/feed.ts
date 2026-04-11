import type { NewsItem } from "./items"

/**
 * Type of feed based on content update frequency and nature.
 */
export type FeedType = "hottest" | "realtime" | "timeline" | "normal"

/**
 * Type of board for displaying feeds.
 */
export type BoardType = "recommend" | "stars"

/**
 * Response structure for feed data.
 */
export interface FeedResponse {
  /**
   * Status of the response
   */
  status: "success" | "cache"
  /**
   * Unique identifier for the feed.
   */
  id?: string
  /**
   * Key for cache or identification
   */
  key?: string
  /**
   * Last update timestamp (milliseconds) or ISO string
   */
  updated: number | string
  /**
   * Array of news items
   */
  items: NewsItem[]
}
