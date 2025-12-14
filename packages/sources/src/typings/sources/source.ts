import type { Color } from "@newsnext/shared/types"
import type { NewsItem } from "."
import type { Either } from "../type.util"
import type { Parameter } from "./params"

export type CategoryId = "tech" | "finance" | "china" | "world" | "others"

export const categories: Record<CategoryId, string> = {
  tech: "Technology",
  finance: "Finance & Economics",
  china: "China",
  world: "International",
  others: "Others",
}

export type SourceFetcher = (params?: any) => Promise<NewsItem[]>

export type DefineSource = Partial<Omit<Source, "fetcher" | "namespace" | "id">>
  & {
    name: string
    color: Color
  } & (
    Either<
      {
        sub: ({
          title: string
          fetcher: SourceFetcher
        } & (
          Either<{
            id: "default"
          }, {
            id: string
          }>
        ) & Partial<Omit<Source, "name" | "namespace">>
        )[]
      },
      {
        fetcher: SourceFetcher
      }
    >
  )

export interface Source {
  icon?: string
  /**
   * namespace name
   */
  name: string
  /**
   * namespace id, auto generated from filename
   */
  namespace: string
  /**
   * Unique identifier for the source variant
   */
  id: string
  /**
   * source name, sub title
   */
  title?: string
  /**
   * refresh interval in ms
   */
  interval: number
  params?: Record<string, Parameter>
  color: Color
  /**
   * description
   */
  desc?: string
  /**
   * @default timeline
   */
  type?: "hottest" | "timeline"
  category: CategoryId
  home?: string
  /**
   * disable this source
   * @default false
   */
  disable?: boolean
  fetcher: SourceFetcher
}

export type SourceOptions = Omit<Source, "namespace">
export type SourceInfo = Omit<Source, "fetcher">

export type SourcesMap = Record<CategoryId, {
  name: string
  sources: SourceInfo[]
}>

export type SourceMeta = Omit<Source, "fetcher" | "disable">
