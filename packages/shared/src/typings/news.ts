import type { Either } from "./util"

export interface Picture {
  url: string
  scale?: number
  radius?: number
}

export type BaseInfo = Either<{
  text?: string
}, {
  html?: string
}>
& {
  picture?: string | Picture
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
  info?: BaseInfo
  /**
   * Detailed information shown on hover
   */
  detail?: BaseInfo
}
