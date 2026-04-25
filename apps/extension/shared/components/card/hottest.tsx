import type { RefObject } from "react"
import type { NewsItem } from "@/typings/feed"
import { cn } from "@/lib/utils"
import { VirtualList } from "../common/virtual-list"
import { NewsItemLink, NewsItemSummary } from "./news-item-common"

export function Hottest({ items, scrollRef }: { items: NewsItem[], scrollRef: RefObject<HTMLDivElement> }) {
  return (
    <VirtualList
      items={items}
      scrollRef={scrollRef}
      estimateSize={60}
      itemClassName="pb-2 last:pb-0"
      renderItem={(item, index) => (
        <NewsItemLink
          item={item}
          className={cn(
            "flex gap-2 items-start relative cursor-pointer **:cursor-pointer transition-all",
            "hover:bg-neutral-400/10 rounded-xl",
          )}
        >
          <span className="opacity-80 bg-neutral-400/10 ml-0.5 mt-0.5 size-5 shrink-0 flex justify-center items-center rounded-full text-sm">
            {index + 1}
          </span>
          <NewsItemSummary item={item} />
        </NewsItemLink>
      )}
    />
  )
}
