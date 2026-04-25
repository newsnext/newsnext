import type { RefObject } from "react"
import type { NewsItem } from "@/typings/feed"
import { useRelativeTime } from "@/hooks/useRelativeTime"
import { cn } from "@/lib/utils"
import { VirtualList } from "../common/virtual-list"
import { NewsItemLink, NewsItemSummary } from "./news-item-common"

function RelativeTime({ date }: { date: number }) {
  return useRelativeTime({ date })
}

const RAIL_PATH = "M6 0 Q0 25 6 50 Q12 75 6 100"

export function Timeline({ items, scrollRef, relativeUpdatedTime }: {
  items: NewsItem[]
  scrollRef: RefObject<HTMLDivElement>
  relativeUpdatedTime: string
}) {
  return (
    <VirtualList
      items={items}
      scrollRef={scrollRef}
      estimateSize={50}
      className="relative z-0"
      renderItem={(item, index) => (
        <div className="flex min-w-0 gap-0.5 pr-1 rounded-xl hover:bg-neutral-400/10">
          <div className="relative w-3.5 shrink-0 self-stretch" aria-hidden>
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 12 100"
              preserveAspectRatio="none"
            >
              <path
                d={RAIL_PATH}
                className="fill-none stroke-foreground/25"
                vectorEffect="non-scaling-stroke"
                strokeWidth={1.25}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className={cn("min-w-0 flex-1 flex flex-col", index !== items.length - 1 && "pb-2")}>
            <div className="-ml-2">
              <span className="text-xs bg-neutral-400/10 py-0.5 px-1 rounded-3xl opacity-80">
                {item.timestamp
                  ? <RelativeTime date={item.timestamp!} />
                  : relativeUpdatedTime}
              </span>
            </div>
            <NewsItemLink item={item}>
              <NewsItemSummary item={item} />
            </NewsItemLink>
          </div>
        </div>
      )}
    />
  )
}
