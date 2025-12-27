import type { NewsItem } from "@/typings/source"
import { useIsMobile } from "@newsnext/ui/hooks/use-mobile"
import { formatDistanceToNow } from "date-fns"

import { enUS } from "date-fns/locale"
import { cn } from "@/lib/utils"

export function Timeline({ items }: { items: NewsItem[] }) {
  const isMobile = useIsMobile()

  return (
    <ol className="border-s border-neutral-400/50 flex flex-col ml-1">
      {items?.map(item => (
        <li key={`${item.url}`} className="flex flex-col">
          <span className="flex items-center gap-1 text-neutral-400/50 ml--1px">
            <span className="">-</span>
            <span className="text-xs text-neutral-400/80">
              {(item.updated) && (
                <NewsUpdatedTime date={(item.updated)!} />
              )}
            </span>
            <span className="text-xs text-neutral-400/80">
              <ExtraInfo item={item} />
            </span>
          </span>
          <a
            className={cn(
              "ml-2 px-1 hover:bg-neutral-400/10 rounded-md",
              "cursor-pointer **:cursor-pointer transition-all",
            )}
            href={isMobile ? item.mobileUrl || item.url : item.url}
            title={item.extra?.hover}
            target="_blank"
            rel="noopener noreferrer"
          >
            {item.title}
          </a>
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

function ExtraInfo({ item }: { item: NewsItem }) {
  if (item?.extra?.info) {
    return <>{item.extra.info}</>
  }
  if (item?.extra?.icon) {
    const { url, scale } = typeof item.extra.icon === "string" ? { url: item.extra.icon, scale: undefined } : item.extra.icon
    return (
      <img
        src={url}
        referrerPolicy="no-referrer"
        alt="icon"
        style={{
          transform: `scale(${scale ?? 1})`,
        }}
        className="h-4 inline -mt-1"
        onError={e => e.currentTarget.style.display = "none"}
      />
    )
  }
  return null
}
