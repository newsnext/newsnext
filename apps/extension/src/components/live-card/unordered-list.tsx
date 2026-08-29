import type { SourceItemTemplate } from "@newsnext/source-kit/types"
import type { NewsItem } from "@/typings/source"
import { VirtualList } from "@newsnext/ui/components/virtual-list"
import { RelativeTime } from "@/hooks/useRelativeTime"
import { getNewsItemTime } from "@/lib/source"
import { NewsItemLink, NewsItemSummary } from "./news-item-common"

interface Props {
  items: NewsItem[]
  itemTemplate?: SourceItemTemplate
  markScale?: number
  scrollElement: HTMLDivElement | null
}

export function UnorderedList({ items, itemTemplate, markScale, scrollElement }: Props) {
  return (
    <VirtualList
      items={items}
      scrollElement={scrollElement}
      estimateSize={60}
      itemClassName="pb-2 last:pb-0"
      renderItem={(item) => {
        const time = getNewsItemTime(item)
        return (
          <NewsItemLink
            item={item}
            className="flex items-center gap-2 rounded-xl transition-colors outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-theme-400"
          >
            <span className="flex min-h-6 w-6 shrink-0 self-stretch items-center justify-center" aria-hidden>
              <span className="size-1.5 rounded-full bg-current opacity-40" />
            </span>
            <NewsItemSummary
              item={item}
              itemTemplate={itemTemplate}
              inlineSuffix={time === undefined ? undefined : <RelativeTime date={time} />}
              markScale={markScale}
            />
          </NewsItemLink>
        )
      }}
    />
  )
}
