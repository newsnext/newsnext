import type { NewsItem } from "@/typings/source"
import { VirtualList } from "@newsnext/ui/components/virtual-list"
import { useAtomValue } from "jotai"
import { memo, useCallback, useId, useMemo } from "react"
import { formatRelativeTime, minuteDateAtom } from "@/hooks/useRelativeTime"
import { cn } from "@/lib/utils"
import { NewsItemLink, NewsItemSummary } from "./news-item-common"
import { TimelineRail } from "./timeline-rail"

interface Props {
  items: NewsItem[]
  scrollElement: HTMLDivElement | null
  updatedAt: number
}

const TimelineNewsItem = memo(({ item }: { item: NewsItem }) => (
  <NewsItemLink item={item} className="flex">
    <NewsItemSummary item={item} />
  </NewsItemLink>
))

export function Timeline({ items, scrollElement, updatedAt }: Props) {
  const gradientId = useId().replace(/:/g, "")
  const now = useAtomValue(minuteDateAtom)
  const timeLabels = useMemo(() => items.map(item => item.timestamp
    ? formatRelativeTime(item.timestamp, now)
    : formatRelativeTime(updatedAt, now)), [items, now, updatedAt])
  const renderItem = useCallback((item: NewsItem, index: number) => {
    const timeLabel = timeLabels[index]
    const showTimeLabel = index === 0 || timeLabel !== timeLabels[index - 1]

    return (
      <div className={cn("relative min-w-0 pb-2", index === items.length - 1 && "pb-0")}>
        <TimelineRail
          gradientId={gradientId}
          index={index}
          showLabel={showTimeLabel}
        />
        <div className="flex min-w-0 rounded-xl hover:bg-muted">
          <div className="w-5 shrink-0" aria-hidden />
          <div className="min-w-0 flex flex-1 flex-col">
            {showTimeLabel && (
              <div className="-ml-4 mb-2 mt-1">
                <span className="inline-flex rounded-3xl bg-muted p-1 text-xs leading-none opacity-80">
                  {timeLabel}
                </span>
              </div>
            )}
            <TimelineNewsItem item={item} />
          </div>
        </div>
      </div>
    )
  }, [gradientId, items.length, timeLabels])

  return (
    <VirtualList
      items={items}
      scrollElement={scrollElement}
      estimateSize={50}
      className="relative z-0"
      itemClassName=""
      renderItem={renderItem}
    />
  )
}
