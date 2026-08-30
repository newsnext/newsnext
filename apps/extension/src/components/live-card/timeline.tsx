import type { SourceItemPresentation } from "@newsnext/source-kit/types"
import type { NewsItem } from "@/typings/source"
import { VirtualList } from "@newsnext/ui/components/virtual-list"
import { useCallback, useId } from "react"
import { useRelativeTimes } from "@/hooks/useRelativeTime"
import { cn } from "@/lib/utils"
import { NewsItemLink, NewsItemSummary } from "./news-item-common"
import { TimelineRail } from "./timeline-rail"

interface Props {
  items: NewsItem[]
  itemPresentation?: SourceItemPresentation[]
  markScale?: number
  scrollElement: HTMLDivElement | null
  times: readonly number[]
}

export function Timeline({ items, itemPresentation, markScale, scrollElement, times }: Props) {
  const gradientId = useId().replace(/:/g, "")
  const timeLabels = useRelativeTimes(times)
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
        <NewsItemLink
          item={item}
          className="flex min-w-0 rounded-xl transition-colors outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-theme-400"
        >
          <div className="w-5 shrink-0" aria-hidden />
          <div className="min-w-0 flex flex-1 flex-col">
            {showTimeLabel && (
              <div className="-ml-4 mb-2 mt-1">
                <span className="inline-flex rounded-3xl bg-muted p-1 text-xs leading-none opacity-80">
                  {timeLabel}
                </span>
              </div>
            )}
            <NewsItemSummary
              item={item}
              inlineText={itemPresentation?.[index]?.inline}
              markScale={markScale}
            />
          </div>
        </NewsItemLink>
      </div>
    )
  }, [gradientId, itemPresentation, items.length, markScale, timeLabels])

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
