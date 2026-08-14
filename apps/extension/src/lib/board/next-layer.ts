import type { NewsItem } from "@/typings/source"
import { getNewsItemTime } from "@/lib/source/presentation"

export interface NextLayerSourceItems<TSource> {
  items: NewsItem[]
  source: TSource
  updatedAt: number
}

export interface NextLayerItem<TSource> {
  item: NewsItem
  rank: number
  source: TSource
  timestamp: number
}

/**
 * Combines source results into a newest-first timeline. Items without their own
 * timestamp inherit the source update time, matching the card timeline.
 */
export function mixSourceItems<TSource>(
  sources: NextLayerSourceItems<TSource>[],
): NextLayerItem<TSource>[] {
  return sources
    .flatMap(({ items, source, updatedAt }, sourceIndex) => items.map((item, index) => ({
      item,
      rank: index + 1,
      source,
      sourceIndex,
      timestamp: getNewsItemTime(item) ?? updatedAt,
    })))
    .sort((left, right) => (
      right.timestamp - left.timestamp
      || left.rank - right.rank
      || left.sourceIndex - right.sourceIndex
    ))
    .map(({ item, rank, source, timestamp }) => ({
      item,
      rank,
      source,
      timestamp,
    }))
}
