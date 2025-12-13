import type { Color } from "@newsnext/shared/types"
import type { NewsItem, SourceID } from "."
import type { XOR } from "../type.util"
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
    XOR<
      {
        sub: ({
          id: SourceID
          title: string
          getter: SourceGetter
        } & Partial<Omit<Source, "name" | "namespace" | "key">>
        )[]
      },
      {
        id?: SourceID
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
   * source id，uuid 是不是应该就用这个 id 代替 呢。
   * 或者说 uuid 始终用 namespace:xxxxx 代替呢，我们随机生成这个 id。始终保持在 namespace 下面。
   * 其实可以在 generate 的时候替换成 namespace:id 就不用多一个属性了。
   */
  id: SourceID
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
