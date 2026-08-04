import type { NewsItem } from "@/typings/source"
import { VirtualList } from "@newsnext/ui/components/virtual-list"
import { useAtomValue } from "jotai"
import { memo, useCallback, useId, useMemo } from "react"
import { formatRelativeTime, minuteDateAtom } from "@/hooks/useRelativeTime"
import { cn } from "@/lib/utils"
import { NewsItemLink, NewsItemSummary } from "./news-item-common"

const RAIL_PATH = "M6 0 Q0 25 6 50 Q12 75 6 100"
const LABEL_RAIL_PATH = "M16 0 Q3 0 2 20 Q2 35 6 50 Q12 75 6 100"
const RAIL_COLOR = "var(--color-theme-300)"

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
        <div className="-ml-0.5 pointer-events-none absolute inset-y-0 w-4" aria-hidden>
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 14 100"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient
                id={`${gradientId}-${index}`}
                x1="0"
                y1="0"
                x2="0"
                y2="100"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor={RAIL_COLOR} stopOpacity={0.05} />
                <stop offset="55%" stopColor={RAIL_COLOR} stopOpacity={0.35} />
                <stop offset="100%" stopColor={RAIL_COLOR} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <path
              d={showTimeLabel ? LABEL_RAIL_PATH : RAIL_PATH}
              className="fill-none"
              stroke={`url(#${gradientId}-${index})`}
              vectorEffect="non-scaling-stroke"
              strokeWidth={1.25}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="flex min-w-0 rounded-xl hover:bg-neutral-400/10">
          <div className="w-5 shrink-0" aria-hidden />
          <div className="min-w-0 flex flex-1 flex-col">
            {showTimeLabel && (
              <div className="-ml-4 mb-2 mt-1">
                <span className="inline-flex rounded-3xl bg-neutral-400/10 p-1 text-xs leading-none opacity-80">
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
