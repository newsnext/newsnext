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

export type SourceGetter = (params?: any) => Promise<NewsItem[]>

export type InitalSource = Partial<Omit<Source, "getter" | "namespace" | "id">>
  & {
    name: string
    color: Color
  } & (
    Either<
      {
        sub: ({
          title: string
          getter: SourceGetter
        } & (
          Either<{
            id: "default"
          }, {
            id: string
          }>
        ) & Partial<Omit<Source, "name" | "namespace" | "key">>
        )[]
      },
      {
        getter: SourceGetter
      }
    >
  )

export interface Source {
  /**
   * forked from upstream source
   */
  upstream?: string
  /**
   * namespace name
   */
  name: string
  /**
   * namespace id, auto generated from filename
   */
  namespace: string
  /**
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
  getter: SourceGetter
}

export type SourceWithoutNamespaceKey = Omit<Source, "namespace" | "key">
export type SourceWithoutGetter = Omit<Source, "getter">

export type Metadata = Record<CategoryId, {
  name: string
  sources: SourceWithoutGetter[]
}>

export type MetaSource = Omit<Source, "getter" | "disable">
