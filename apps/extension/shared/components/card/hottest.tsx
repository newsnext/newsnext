import type { RefObject } from "react"
import type { NewsItem } from "@/typings/source"
import { extractPictures } from "@newsnext/shared/types"
import { cn } from "@/lib/utils"
import { VirtualList } from "../common/virtual-list"
import { NewsItemInfo, NewsItemLink, ProxiedImage } from "./news-item-common"

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
            "flex gap-2 items-stretch relative cursor-pointer **:cursor-pointer transition-all",
            "hover:bg-neutral-400/10 rounded-md",
          )}
        >
          <span className="bg-neutral-400/10 min-w-6 flex justify-center items-center rounded-md text-sm">
            {index + 1}
          </span>
          <span className="self-start leading-none">
            {item.meta?.icon && extractPictures(item.meta.icon).map((icon, i) => {
              const { url, scale, radius } = icon
              return (
                <ProxiedImage
                  key={`icon-${i}`}
                  src={url}
                  style={{
                    transform: `scale(${scale ?? 1})`,
                    borderRadius: `${radius ?? 4}px`,
                  }}
                  className="h-4 w-4 object-contain inline -mt-1 mr-1"
                />
              )
            })}
            <span className="text-base mr-2">
              {item.title}
            </span>
            {item.meta && (
              <NewsItemInfo item={item} className="truncate align-middle" />
            )}
          </span>
        </NewsItemLink>
      )}
    />
  )
}
