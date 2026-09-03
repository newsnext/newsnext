import type { NewsItem } from "@/typings/source"
import { VirtualList } from "@newsnext/ui/components/virtual-list"
import { RelativeTime } from "@/hooks/useRelativeTime"
import { getNewsItemTime } from "@/lib/source"
import { NewsItemLink, NewsItemSummary } from "./news-item-common"

interface Props {
  items: NewsItem[]
  inlinePresentation?: string[]
  markScale?: number
  scrollElement: HTMLDivElement | null
}

export function UnorderedList({ items, inlinePresentation, markScale, scrollElement }: Props) {
  return (
    <VirtualList
      items={items}
      scrollElement={scrollElement}
      estimateSize={60}
      itemClassName="pb-2 last:pb-0"
      renderItem={(item, index) => {
        const time = getNewsItemTime(item)
        const inlineSuffix = time === undefined ? undefined : <RelativeTime date={time} />
        return (
          <NewsItemLink
            item={item}
            inlineText={inlinePresentation?.[index]}
            inlineSuffix={inlineSuffix}
            markScale={markScale}
            previewItems={items}
            previewIndex={index}
            previewInlinePresentation={inlinePresentation}
            showPreviewTime
            className="flex items-center gap-2 rounded-xl transition-colors outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-theme-400"
          >
            <span className="flex min-h-6 w-6 shrink-0 self-stretch items-center justify-center" aria-hidden>
              <span className="size-1.5 rounded-full bg-current opacity-40" />
            </span>
            <NewsItemSummary
              item={item}
              inlineText={inlinePresentation?.[index]}
              inlineSuffix={inlineSuffix}
              markScale={markScale}
            />
          </NewsItemLink>
        )
      }}
    />
  )
}
