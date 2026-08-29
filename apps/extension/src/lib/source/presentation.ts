import type { SourcePresentationType } from "@newsnext/source-kit/types"
import type { NewsItem } from "@/typings/source"

export type NewsItemsPresentation
  = | { type: "list" }
    | { type: "ranking" }
    | { type: "timeline", times: number[] }

export function getNewsItemTime(item: NewsItem): number | undefined {
  return item.publishedAt ?? item.updatedAt
}

function getDescendingItemTimes(
  items: readonly NewsItem[],
  field: "publishedAt" | "updatedAt",
): number[] | undefined {
  const times: number[] = []
  let previousTimestamp = Number.POSITIVE_INFINITY
  for (const item of items) {
    const timestamp = item[field]
    if (timestamp === undefined || !Number.isFinite(timestamp) || timestamp > previousTimestamp) {
      return undefined
    }
    times.push(timestamp)
    previousTimestamp = timestamp
  }

  return times
}

export function getTimelineItemTimes(items: readonly NewsItem[]): number[] | undefined {
  if (items.length === 0) {
    return undefined
  }

  return getDescendingItemTimes(items, "publishedAt")
    ?? getDescendingItemTimes(items, "updatedAt")
}

export function getNewsItemsPresentation(
  items: readonly NewsItem[],
  declaredType?: SourcePresentationType,
): NewsItemsPresentation {
  if (declaredType) return { type: declaredType }

  const times = getTimelineItemTimes(items)
  return times ? { type: "timeline", times } : { type: "list" }
}
