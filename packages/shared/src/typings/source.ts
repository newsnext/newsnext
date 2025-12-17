import type { NewsItem } from "./news"

export type SourceType = "hottest" | "realtime" | "timeline" | "normal"

export type BoardType = "hottest" | "timeline" | "realtime"

export interface SourceResponse {
  status: "success" | "cache"
  id?: string
  key?: string
  updated: number | string
  items: NewsItem[]
}
