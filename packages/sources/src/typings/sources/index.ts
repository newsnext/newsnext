import type { NewsItem, SourceResponse } from "@newsnext/shared/types"
import type { SourceMeta } from "./source"

export * from "./params"
export * from "./source"

export type { NewsItem, SourceResponse }

/**
 * Source response with metadata
 */
export interface MetaSourceResponse {
  /**
   * Source identifier
   */
  id: string
  /**
   * Source metadata
   */
  meta: SourceMeta
  /**
   * Last update timestamp (milliseconds) or ISO string
   */
  updated?: number | string
  /**
   * News items from the source
   */
  items?: NewsItem[]
}
