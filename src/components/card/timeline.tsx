import type { NewsItem } from "@/typings/source"
import { formatDistanceToNow } from "date-fns"

import { zhCN } from "date-fns/locale"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

export function NewsListTimeline({ items }: { items: NewsItem[] }) {
  const isMobile = useIsMobile()

  return (
    <ol className="border-l border-neutral-400/30 flex flex-col ml-1 pl-3">
      {items?.map(item => (
        <li key={`${item.id}-${item.pubDate || item?.extra?.date || ""}`} className="flex flex-col pb-3 relative">
          <div className="absolute -left-[13px] top-1.5 w-1.5 h-1.5 rounded-full bg-neutral-400/50" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground/70 mb-1">
            {(item.pubDate || item?.extra?.date) && (
              <span>
                <NewsUpdatedTime date={(item.pubDate || item?.extra?.date)!} />
              </span>
            )}
            {(item.extra?.info || item.extra?.icon) && (
              <span>
                <ExtraInfo item={item} />
              </span>
            )}
          </div>
          <a
            className={cn(
              "hover:bg-neutral-400/10 rounded px-1 -ml-1 py-0.5 visited:text-muted-foreground/70",
              "cursor-pointer transition-all text-sm leading-relaxed",
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
    return <>{formatDistanceToNow(d, { addSuffix: true, locale: zhCN })}</>
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
