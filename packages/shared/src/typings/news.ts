import type { Either } from "./util"

export type Info = Either<{
  text?: string
}, {
  html?: string
}>
& {
  picture?: string | {
    url: string
    scale?: number
    radius?: number
  }
}

export interface NewsItem {
  /**
   * Title of the news item
   */
  title: string
  /**
   * URL of the news item (used as unique identifier)
   */
  url: string
  /**
   * Mobile-optimized URL
   * @default url
   */
  mobileUrl?: string
  /**
   * Timestamp in milliseconds
   */
  timestamp?: number
  /**
   * Additional information displayed at the end of the item
   */
  info?: Info
  /**
   * Detailed information shown on hover
   */
  detail?: Info
}
