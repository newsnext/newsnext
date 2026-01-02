import type { RefObject } from "react"
import type { NewsItem } from "@/typings/source"
import { extractPictures } from "@newsnext/shared/types"
import { useRelativeTime } from "@/hooks/useRelativeTime"
import { VirtualList } from "../common/virtual-list"
import { NewsItemInfo, NewsItemLink, ProxiedImage } from "./news-item-common"

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
      className="border-s border-neutral-400/50"
      itemClassName="pb-2 pl-[8px] last:pb-0"
      renderItem={item => (
        <div className="flex flex-col hover:bg-neutral-400/10 rounded-md px-1">
          <span className="text-neutral-400/50 -mt-1 -ml-1">
            <span className="inline-block w-4 -ml-2">-</span>
            <span className="space-x-1 -ml-2">
              <span className="text-xs text-neutral-400/80 bg-neutral-400/10 py-0.5 px-1 rounded-md">
                {item.timestamp ? <RelativeTime date={item.timestamp!} /> : relativeUpdatedTime}
              </span>
              {item.meta && (
                <NewsItemInfo item={item} />
              )}
            </span>
          </span>
          <NewsItemLink item={item}>
            {item.meta?.icon && extractPictures(item.meta.icon).slice(0, 1).map((icon, i) => {
              const { src, scale, radius, href } = icon
              return (
                <ProxiedImage
                  key={`icon-${i}`}
                  src={src}
                  href={href}
                  style={{
                    transform: `scale(${scale ?? 1})`,
                    borderRadius: `${radius ?? 4}px`,
                  }}
                  className="h-4 w-4 object-contain inline -mt-1 mr-1"
                />
              )
            })}
            {item.title}
          </NewsItemLink>
        </div>
      )}
    />
  )
}
