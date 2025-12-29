import type { RefObject } from "react"
import type { NewsItem } from "@/typings/source"
import { useRelativeTime } from "@/hooks/useRelativeTime"
import { VirtualList } from "../common/virtual-list"
import { NewsItemInfo, NewsItemLink } from "./news-item-common"

function RelativeTime({ date }: { date: number }) {
  const time = useRelativeTime({ date })
  return (
    <span className="text-xs text-neutral-400/80 bg-neutral-400/10 py-0.5 px-1 rounded-md">
      {time}
    </span>
  )
}

export function Timeline({ items, scrollRef }: { items: NewsItem[], scrollRef: RefObject<HTMLDivElement> }) {
  return (
    <VirtualList
      items={items}
      scrollRef={scrollRef}
      estimateSize={50}
      className="border-s border-neutral-400/50"
      itemClassName="pb-2 pl-[10px]"
      renderItem={item => (
        <div className="flex flex-col hover:bg-neutral-400/10 rounded-md px-1">
          <span className="text-neutral-400/50 -mt-1 -ml-1">
            <span className="inline-block w-4 -ml-3">-</span>
            <span className="space-x-1 -ml-1">
              {(item.timestamp) && (
                <RelativeTime date={item.timestamp!} />
              )}
              {item.info && (
                <NewsItemInfo item={item} />
              )}
            </span>
          </span>
          <NewsItemLink item={item}>
            {item.title}
          </NewsItemLink>
        </div>
      )}
    />
  )
}
