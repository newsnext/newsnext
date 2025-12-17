import type { Color, NewsItem, SourceType } from "@newsnext/shared/types"

export type { SourceType }

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
  namespace: string
  sub?: Record<string, SubSource>
}

export function defineSource(source: Source): Source {
  return source
}

export type { NewsItem }

export type SourceHandler = () => Promise<NewsItem[]>
export function defineSourceHandler(handler: SourceHandler): SourceHandler {
  return handler
}