import type { NewsItem } from "@/typings/source"

export function isTimelineItems(items: readonly NewsItem[]): boolean {
  if (items.length === 0) {
    return false
  }

  let previousTimestamp = Number.POSITIVE_INFINITY
  for (const item of items) {
    if (
      item.timestamp === undefined
      || !Number.isFinite(item.timestamp)
      || item.timestamp > previousTimestamp
    ) {
      return false
    }
    previousTimestamp = item.timestamp
  }

  return true
}
