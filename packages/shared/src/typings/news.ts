export interface NewsItem {
  title: string
  /**
   * as Identifier
   */
  url: string
  /**
   * @default url
   */
  mobileUrl?: string
  timestamp?: number
  info?: {
    /**
     * Hover text, displayed when hovering over the item
     * HTML supported
     */
    detail?: string
    /**
     * Text displayed in the end of the item
     * HTML supported
     */
    text?: string
    /**
     * Icon displayed in the end of the item
     */
    icon?: string | {
      url: string
      scale?: number
    }
  }
}
