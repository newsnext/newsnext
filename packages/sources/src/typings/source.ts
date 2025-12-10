import type { Color } from "@newsnext/shared/types"

export type SourceType = "hottest" | "realtime" | "normal"

export interface SubSource {
  title: string
  handler: SourceHandler
  default?: boolean
  color?: Color
  type?: SourceType
  lang?: string
  desc?: string
  home?: string
}

export interface Source {
  name: string
  lang?: string
  interval: number
  color: Color
  title?: string
  desc?: string
  type?: SourceType
  home?: string
  sub?: Record<string, SubSource>
}

export function defineSource(source: Source): Source {
  return source
}

export interface NewsItem {
  id: string | number // unique
  title: string
  url: string
  mobileUrl?: string
  pubDate?: number | string
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

export type SourceHandler = () => Promise<NewsItem[]>
export function defineSourceHandler(handler: SourceHandler): SourceHandler {
  return handler
}