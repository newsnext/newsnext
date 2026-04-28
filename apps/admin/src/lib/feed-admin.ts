import type { AppRouter } from "@newsnext/api/trpc"
import type { inferRouterOutputs } from "@trpc/server"
import { categories } from "@newsnext/feeds/typings"

export interface FeedDraft {
  name: string
  title: string
  interval: string
  paramsText: string
  color: string
  desc: string
  type: "" | "hottest" | "timeline"
  category: string
  home: string
  icon: string
  enabled: boolean
}

export type AdminFeedRow = inferRouterOutputs<AppRouter>["getAdminFeeds"][number]
export type FilterState = "all" | "enabled" | "disabled"
export type StatusTone = "muted" | "success" | "error"

export interface FeedStats {
  total: number
  enabled: number
  disabled: number
  providers: number
  categories: number
}

export const TYPE_OPTIONS = [
  { label: "Default", value: "" },
  { label: "Hottest", value: "hottest" },
  { label: "Timeline", value: "timeline" },
] as const

export const selectClassName = "h-9 w-full rounded-4xl border border-input bg-input/30 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"

export function createDraft(feed: AdminFeedRow): FeedDraft {
  return {
    name: feed.name,
    title: feed.title ?? "",
    interval: String(feed.interval),
    paramsText: JSON.stringify(feed.params ?? {}, null, 2),
    color: feed.color,
    desc: feed.desc ?? "",
    type: feed.type === "hottest" || feed.type === "timeline" ? feed.type : "",
    category: feed.category,
    home: feed.home ?? "",
    icon: feed.icon ?? "",
    enabled: feed.enabled,
  }
}

export function formatCategory(category: string): string {
  return categories[category as keyof typeof categories] ?? category
}
