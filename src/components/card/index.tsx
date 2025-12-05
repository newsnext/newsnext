import { Star } from "lucide-react"
import { useState } from "react"
import PhArrowCounterClockwiseDuotone from "~icons/ph/arrow-counter-clockwise-duotone"

import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { NewsListHot } from "./hottest"
import { MOCK_ITEMS_HOT, MOCK_ITEMS_TIMELINE, MOCK_SOURCES } from "./mock-data"
import { NewsListTimeline } from "./timeline"

interface CardProps {
  id: string
  className?: string
}

export default function Card({ id, className }: CardProps) {
  const source = MOCK_SOURCES[id] || MOCK_SOURCES["36kr"]
  const [isFocused, setIsFocused] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const items = source.type === "hottest" ? MOCK_ITEMS_HOT : MOCK_ITEMS_TIMELINE

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  return (
    <div
      className={cn(
        "flex flex-col h-[500px] rounded-2xl p-4 transition-opacity-300",
        `bg-${source.color}-400/40`,
        className,
      )}
    >
      <div className="flex justify-between mb-3 items-center">
        <div className="flex gap-2.5 items-center">
          <a
            className="w-9 h-9 rounded-full bg-cover bg-center bg-no-repeat border-2 border-border/50 shrink-0"
            target="_blank"
            rel="noreferrer"
            href={source.home}
            title={source.desc}
            style={{
              backgroundImage: `url(/icons/${id}.png)`,
            }}
          />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">
                {source.name}
              </span>
              {source.title && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {source.title}
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground/70">
              {isRefreshing ? "Refreshing..." : "Updated just now"}
            </span>
          </div>
        </div>
        <div className="flex gap-1 items-center shrink-0">
          <button
            type="button"
            className={cn(
              "p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground",
              isRefreshing && "animate-spin",
            )}
            onClick={handleRefresh}
            aria-label="Refresh"
          >
            <PhArrowCounterClockwiseDuotone className="w-4 h-4" />
          </button>
          <button
            type="button"
            className={cn(
              "p-1.5 hover:bg-muted rounded-md transition-colors",
              isFocused ? "text-yellow-500" : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setIsFocused(!isFocused)}
            aria-label="Favorite"
          >
            <Star className={cn("w-4 h-4", isFocused && "fill-current")} />
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1 -mx-2 px-2 min-h-0">
        <div className={cn("pb-2 bg-background rounded-2xl", `sprinkle-${source.color}-400`)}>
          {source.type === "hottest"
            ? (
                <NewsListHot items={items} />
              )
            : (
                <NewsListTimeline items={items} />
              )}
        </div>
      </ScrollArea>
    </div>
  )
}
