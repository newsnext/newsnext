import type { Color } from "@newsnext/shared/types"
import type { RefObject } from "react"
import type { NewsItem } from "@/typings/source"
import { cn } from "@/lib/utils"
import { VirtualList } from "../common/virtual-list"
import { NewsItemLink } from "../preview/news-item-preview"
import { getNewsItemKey, NewsItemSummary } from "./news-item-common"

interface Props {
  items: NewsItem[]
  scrollRef: RefObject<HTMLDivElement>
  color: Color
  previewSelection?: {
    selectedItemUrl?: string
    onSelectItem: (item: NewsItem) => void
  }
}

export function Hottest({ items, scrollRef, color, previewSelection }: Props) {
  return (
    <VirtualList
      items={items}
      scrollRef={scrollRef}
      estimateSize={60}
      itemClassName="pb-2 last:pb-0"
      getItemKey={getNewsItemKey}
      renderItem={(item, index) => (
        <NewsItemLink
          item={item}
          previewSelection={previewSelection}
          className={cn(
            "flex gap-2 items-start relative cursor-pointer **:cursor-pointer transition-all",
            "hover:bg-neutral-400/10 rounded-xl",
          )}
        >
          <span className={cn("opacity-80 size-6 shrink-0 flex justify-center items-center rounded-full text-sm", `bg-${color}-400/10`)}>
            {index + 1}
          </span>
          <NewsItemSummary item={item} />
        </NewsItemLink>
      )}
    />
  )
}
