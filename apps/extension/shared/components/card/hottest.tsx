import type { NewsItem } from "@/typings/source"
import { cn } from "@/lib/utils"
import { NewsItemInfo, NewsItemLink } from "./news-item-common"

export function Hottest({ items }: { items: NewsItem[] }) {
  return (
    <ol className="flex flex-col gap-2">
      {items?.map((item, i) => (
        <NewsItemLink
          key={item.url}
          item={item}
          className={cn(
            "flex gap-2 items-stretch relative cursor-pointer **:cursor-pointer transition-all",
            "hover:bg-neutral-400/10 rounded-md",
          )}
        >
          <span className="bg-neutral-400/10 min-w-6 flex justify-center items-center rounded-md text-sm">
            {i + 1}
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
      ))}
    </ol>
  )
}
