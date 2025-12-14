import type { NewsItem } from "@/typings/source"
import { useIsMobile } from "@newsnext/ui/hooks/use-mobile"
import { cn } from "@/lib/utils"

export function Hottest({ items }: { items: NewsItem[] }) {
  const isMobile = useIsMobile()

  return (
    <ol className="flex flex-col gap-2">
      {items?.map((item, i) => (
        <a
          href={isMobile ? item.mobileUrl || item.url : item.url}
          target="_blank"
          rel="noreferrer"
          key={item.url}
          title={item.extra?.hover}
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
            {(item.extra?.info || item.extra?.icon) && (
              <span className="text-xs text-neutral-400/80 truncate align-middle">
                <ExtraInfo item={item} />
              </span>
            )}
          </span>
        </a>
      ))}
    </ol>
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
