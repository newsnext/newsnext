import type { Color } from "@newsnext/shared/types"
import type { RefObject } from "react"
import type { NewsItem } from "@/typings/source"
import { useId } from "react"
import { useRelativeTime } from "@/hooks/useRelativeTime"
import { cn } from "@/lib/utils"
import { VirtualList } from "../common/virtual-list"
import { NewsItemLink } from "../preview/news-item-preview"
import { NewsItemSummary } from "./news-item-common"

function RelativeTime({ date }: { date: number }) {
  return useRelativeTime({ date })
}

const RAIL_PATH = "M6 0 Q0 25 6 50 Q12 75 6 100"

interface Props {
  items: NewsItem[]
  scrollRef: RefObject<HTMLDivElement>
  relativeUpdatedTime: string
  color: Color
  previewSelection?: {
    selectedItemUrl?: string
    onSelectItem: (item: NewsItem) => void
  }
}

export function Timeline({ items, scrollRef, relativeUpdatedTime, color, previewSelection }: Props) {
  const gradientIdPrefix = useId().replace(/:/g, "")

  return (
    <VirtualList
      items={items}
      scrollRef={scrollRef}
      estimateSize={50}
      className="relative z-0"
      itemClassName="hover:bg-neutral-400/10 rounded-xl"
      renderItem={(item, index) => (
        <div className="flex min-w-0 gap-0.5">
          <div className="-ml-0.5 relative w-3.5 shrink-0 self-stretch" aria-hidden>
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 12 100"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient
                  id={`${gradientIdPrefix}-${index}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="100"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor={`var(--color-${color}-300)`} stopOpacity={0.05} />
                  <stop offset="55%" stopColor={`var(--color-${color}-300)`} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={`var(--color-${color}-300)`} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <path
                d={RAIL_PATH}
                className="fill-none"
                stroke={`url(#${gradientIdPrefix}-${index})`}
                vectorEffect="non-scaling-stroke"
                strokeWidth={1.25}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className={cn("min-w-0 flex-1 flex flex-col pb-1")}>
            <div className="-ml-2.5 -mt-1">
              <span className={cn("text-xs bg-neutral-400/10 py-0.5 px-1 rounded-3xl opacity-80")}>
                {item.timestamp
                  ? <RelativeTime date={item.timestamp!} />
                  : relativeUpdatedTime}
              </span>
            </div>
            <NewsItemLink item={item} previewSelection={previewSelection} className="pl-2">
              <NewsItemSummary item={item} />
            </NewsItemLink>
          </div>
        </div>
      )}
    />
  )
}
