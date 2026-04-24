import type { RefObject } from "react"
import type { NewsItem } from "@/typings/feed"
import { useRelativeTime } from "@/hooks/useRelativeTime"
import { VirtualList } from "../common/virtual-list"
import { NewsItemLink, NewsItemSummary } from "./news-item-common"

function RelativeTime({ date }: { date: number }) {
  const time = useRelativeTime({ date })
  return time
}

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
      itemClassName="pb-2 last:pb-0"
      renderItem={item => (
        <div className="flex flex-col hover:bg-neutral-400/10 rounded-xl px-1">
          <div>
            <span className="text-xs bg-neutral-400/10 py-0.5 px-1 rounded-3xl">
              {item.timestamp ? <RelativeTime date={item.timestamp!} /> : relativeUpdatedTime}
            </span>
          </div>
          <NewsItemLink item={item}>
            <NewsItemSummary item={item} />
          </NewsItemLink>
        </div>
      )}
    />
  )
}
