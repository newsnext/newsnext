import type { RefObject } from "react"
import type { NewsItem } from "@/typings/source"
import { cn } from "@/lib/utils"
import { VirtualList } from "../common/virtual-list"
import { NewsItemInfo, NewsItemLink } from "./news-item-common"

export function Hottest({ items, scrollRef }: { items: NewsItem[], scrollRef: RefObject<HTMLDivElement> }) {
  return (
    <VirtualList
      items={items}
      scrollRef={scrollRef}
      estimateSize={60}
      itemClassName="pb-2"
      renderItem={(item, index) => (
        <NewsItemLink
          item={item}
          className={cn(
            "flex gap-2 items-stretch relative cursor-pointer **:cursor-pointer transition-all",
            "hover:bg-neutral-400/10 rounded-md",
          )}
        >
          <span className="bg-neutral-400/10 min-w-6 flex justify-center items-center rounded-md text-sm">
            {index + 1}
          </span>
          <span className="self-start leading-none">
            <span className="mr-2 text-base">
              {item.title}
            </span>
            {item.info && (
              <NewsItemInfo item={item} className="truncate align-middle" />
            )}
          </span>
        </NewsItemLink>
      )}
    />
  )
}
