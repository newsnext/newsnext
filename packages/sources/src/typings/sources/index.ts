import type { SourceMeta } from "./source"

export * from "./params"
export * from "./source"

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
    info?: false | string
    diff?: number
    icon?: false | string | {
      url: string
      scale: number
    }
  }
}

export interface SourceResponse {
  status: "success" | "cache"
  id: string
  updated: number | string
  items: NewsItem[]
}

export interface MetaSourceResponse {
  id: string
  meta: SourceMeta
  updated?: number | string
  items?: NewsItem[]
}
