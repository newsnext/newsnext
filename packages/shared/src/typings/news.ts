export interface NewsItem {
  title: string
  url: string
  /**
   * @default url
   */
  mobileUrl?: string
  updated?: number | string
  extra?: {
    hover?: string
    date?: number | string
    info?: false | string
    diff?: number
    icon?: false | string | {
      url: string
      scale: number
    }
  }
}
