import type { NewsItem } from "@/typings/source"

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

export function isTimelineItems(items: readonly NewsItem[]): boolean {
  return getTimelineItemTimes(items) !== undefined
}
