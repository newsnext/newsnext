import type { NewsItem } from "@/typings/source"
import { formatDistanceToNow } from "date-fns"
import { enUS } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { NewsItemInfo, NewsItemLink } from "./news-item-common"

export function Timeline({ items }: { items: NewsItem[] }) {
  return (
    <ol className="border-s border-neutral-400/50 flex flex-col ml-1">
      {items?.map(item => (
        <li key={`${item.url}`} className="flex flex-col">
          <span className="flex items-center gap-1 text-neutral-400/50 ml--1px">
            <span className="">-</span>
            <span className="text-xs text-neutral-400/80">
              {(item.timestamp) && (
                <NewsUpdatedTime date={(item.timestamp)!} />
              )}
            </span>
            {item.info && (
              <NewsItemInfo item={item} />
            )}
          </span>
          <NewsItemLink
            item={item}
            className={cn(
              "ml-2 px-1 hover:bg-neutral-400/10 rounded-md",
              "cursor-pointer **:cursor-pointer transition-all",
            )}
          >
            {item.title}
          </NewsItemLink>
        </li>
      ))}
    </ol>
  )
}

function NewsUpdatedTime({ date }: { date: string | number }) {
  try {
    const d = new Date(date)
    return <>{formatDistanceToNow(d, { addSuffix: true, locale: enUS })}</>
  } catch {
    return null
  }
}
