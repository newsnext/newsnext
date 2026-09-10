import type { NewsItem } from "@/typings/source"
import { validateNewsItems } from "@newsnext/source-kit/core"

export function parseWidgetItems(value: unknown): NewsItem[] {
  if (!value || typeof value !== "object" || !("items" in value) || !Array.isArray(value.items)) {
    throw new Error("Widget query must return an items array")
  }
  if (value.items.length > 500) throw new Error("Widget query must contain at most 500 items")
  return validateNewsItems(value.items.map((entry: unknown) => {
    if (!entry || typeof entry !== "object" || !("value" in entry)) {
      throw new Error("Widget query contains an invalid item entry")
    }
    return entry.value
  }))
}
