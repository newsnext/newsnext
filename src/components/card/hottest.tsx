import type { NewsItem } from "@/typings/source"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

export function NewsListHot({ items }: { items: NewsItem[] }) {
  const isMobile = useIsMobile()

  return (
    <ol className="flex flex-col gap-1.5">
      {items?.map((item, i) => (
        <a
          href={isMobile ? item.mobileUrl || item.url : item.url}
          target="_blank"
          rel="noreferrer"
          key={item.id}
          title={item.extra?.hover}
          className={cn(
            "flex gap-2 items-start relative cursor-pointer transition-all py-1.5 px-1",
            "hover:bg-neutral-400/10 rounded-md visited:text-neutral-400/70",
          )}
        >
          <span className="bg-neutral-400/10 min-w-6 h-6 flex justify-center items-center rounded text-xs text-muted-foreground shrink-0 mt-0.5">
            {i + 1}
          </span>
          {!!item.extra?.diff && <DiffNumber diff={item.extra.diff} />}
          <span className="flex-1 min-w-0">
            <span className="text-sm leading-relaxed block">
              {item.title}
            </span>
            {(item.extra?.info || item.extra?.icon) && (
              <span className="text-xs text-muted-foreground/80 mt-0.5 block">
                <ExtraInfo item={item} />
              </span>
            )}
          </span>
        </a>
      ))}
    </ol>
  )
}

function DiffNumber({ diff }: { diff: number }) {
  if (!diff)
    return null
  const isPositive = diff > 0
  return (
    <span
      className={cn(
        "absolute -left-1 -top-1 text-[10px] font-bold opacity-60",
        isPositive ? "text-red-500" : "text-green-500",
      )}
    >
      {isPositive ? `+${diff}` : diff}
    </span>
  )
}

export function ExtraInfo({ item }: { item: NewsItem }) {
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
