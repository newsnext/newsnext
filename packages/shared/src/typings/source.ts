import type { NewsItem } from "./items"

/**
 * Type of source based on content update frequency and nature
 */
export type SourceType = "hottest" | "realtime" | "timeline" | "normal"

/**
 * Type of board for displaying sources
 */
export type BoardType = "recommend" | "stars"

/**
 * Response structure for source data
 */
export interface SourceResponse {
  /**
   * Status of the response
   */
  status: "success" | "cache"
  /**
   * Unique identifier for the source
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
