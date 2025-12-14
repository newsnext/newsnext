import { Button } from "@newsnext/ui/components/button"
import { cn } from "@/lib/utils"
import {
  PhArrowCounterClockwiseDuotone,
  PhCircleDashedDuotone,
  PhStarDuotone,
  PhStarFill,
} from "../icons/ph"
import { useCard } from "./card-context"
import { Hottest } from "./hottest"
import { Timeline } from "./timeline"

export function CardFront() {
  const {
    source,
    items,
    isRefreshing,
    isStarred,
    onRefresh,
    onToggleStar,
    onCardClick,
    dragHandle,
  } = useCard()

  const { namespace, name, title, desc, home, type, color } = source

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl p-4 h-full",
        `bg-${color}-400/40`,
      )}
      onClick={onCardClick}
    >
      {/* Header */}
      <div className="flex justify-between mb-3 items-center mx-1">
        <div className="flex gap-2.5 items-center ml-1">
          <a
            className="size-8 rounded-full bg-cover"
            target="_blank"
            rel="noreferrer"
            href={home || "#"}
            title={desc || name}
            style={{
              backgroundImage: `url(https://s3.newsnext.pro/icons/${namespace}.png)`,
            }}
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">
                {name}
              </span>
              {title && (
                <span className={cn("text-sm px-1 rounded bg-background/50 opacity-80", `text-${color}-400`)}>
                  {title}
                </span>
              )}
            </div>
            <span className="text-xs opacity-70">
              {isRefreshing ? "Updating..." : "Updated just now"}
            </span>
          </div>
        </div>
        <div className={cn("flex gap-1 items-center shrink-0", `text-${color}-400`)} onClick={e => e.stopPropagation()}>
          <Button
            variant="icon"
            size="icon"
            asChild
            className={cn(
              isRefreshing && "animate-spin",
            )}
            onClick={onRefresh}
            aria-label="Refresh"
          >
            {isRefreshing ? <PhCircleDashedDuotone /> : <PhArrowCounterClockwiseDuotone />}
          </Button>
          <Button
            variant="icon"
            size="icon"
            asChild
            onClick={onToggleStar}
            aria-label="Star"
          >
            {isStarred ? <PhStarFill /> : <PhStarDuotone />}
          </Button>
          {dragHandle}
        </div>
      </div>

      {/* Content */}
      <div
        className={cn(
          "h-full px-2 rounded-2xl py-2 bg-background/70 overflow-y-auto scrollbar-hidden",
          `sprinkle-${color}-400`,
        )}
      >
        {type === "hottest" ? <Hottest items={items} /> : <Timeline items={items} />}
      </div>
    </div>
  )
}
