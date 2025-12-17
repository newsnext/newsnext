import type { NewsItem, SourceResponse } from "@newsnext/shared/types"
import type { SourceMeta } from "./source"

export * from "./params"
export * from "./source"

export type { NewsItem, SourceResponse }

export interface MetaSourceResponse {
  id: string
  meta: SourceMeta
  updated?: number | string
  items?: NewsItem[]
}
