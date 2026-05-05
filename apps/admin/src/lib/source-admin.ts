import type { AppRouter } from "@newsnext/api/trpc"
import type { inferRouterOutputs } from "@trpc/server"
import { categories } from "@newsnext/sources/typings"

export interface SourceDraft {
  name: string
  title: string
  maxCacheAge: string
  paramsText: string
  color: string
  desc: string
  type: "" | "hottest" | "timeline"
  category: string
  home: string
  icon: string
  enabled: boolean
}

export type AdminSourceRow = inferRouterOutputs<AppRouter>["getAdminSources"][number]
export type FilterState = "all" | "enabled" | "disabled"
export type StatusTone = "muted" | "success" | "error"

export interface SourceStats {
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

export function createDraft(source: AdminSourceRow): SourceDraft {
  return {
    name: source.name,
    title: source.title ?? "",
    maxCacheAge: String(source.maxCacheAge),
    paramsText: JSON.stringify(source.params ?? {}, null, 2),
    color: source.color,
    desc: source.desc ?? "",
    type: source.type === "hottest" || source.type === "timeline" ? source.type : "",
    category: source.category,
    home: source.home ?? "",
    icon: source.icon ?? "",
    enabled: source.enabled,
  }
}

export function formatCategory(category: string): string {
  return categories[category as keyof typeof categories] ?? category
}
