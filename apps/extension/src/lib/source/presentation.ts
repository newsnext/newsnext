import type { SourcePresentationType } from "@newsnext/source-kit/types"
import type { NewsItem } from "@/typings/source"

export type NewsItemsPresentation
  = | { type: "list" }
    | { type: "ranking" }
    | { type: "timeline", times: number[] }

export function getTimelineItemTimes(items: readonly NewsItem[]): number[] | undefined {
  if (items.length === 0) return undefined

  const times: number[] = []
  let previousTimestamp = Number.POSITIVE_INFINITY
  for (const item of items) {
    const timestamp = item.publishedAt
    if (timestamp === undefined || !Number.isFinite(timestamp) || timestamp > previousTimestamp) {
      return undefined
    }
    times.push(timestamp)
    previousTimestamp = timestamp
  }

  return times
}

export function getNewsItemsPresentation(
  items: readonly NewsItem[],
  declaredType?: SourcePresentationType,
): NewsItemsPresentation {
  if (declaredType) return { type: declaredType }

  const times = getTimelineItemTimes(items)
  return times ? { type: "timeline", times } : { type: "list" }
}
