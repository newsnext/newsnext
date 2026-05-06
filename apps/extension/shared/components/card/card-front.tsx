import { getFavicon } from "@newsnext/shared/utils"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { useRef } from "react"
import { useRelativeTime } from "@/hooks/useRelativeTime"
import { resolveSourceDisplay } from "@/lib/source-display"
import { cn } from "@/lib/utils"
import { IconButton } from "../common/button"
import {
  PhArrowCounterClockwiseDuotone,
  PhCircleDashedDuotone,
  PhInfoDuotone,
  PhStarDuotone,
  PhStarFill,
} from "../icons/ph"
import { useCard } from "./card-context"
import { Hottest } from "./hottest"
import { Timeline } from "./timeline"

export function CardFront() {
  const {
    source,
    sourceParams,
    items,
    isFetching,
    updatedTime,
    isStarred,
    onRefresh,
    onToggleStar,
    onFlip,
    dragHandle,
    previewSelection,
  } = useCard()

  const { provider, type, color, desc } = source
  const { name, title, home } = resolveSourceDisplay(source, sourceParams)
  const ref = useRef<HTMLDivElement>(null)
  const relativeTime = useRelativeTime({ date: updatedTime })

  return (
    <div className="relative h-full">
      <SquircleBox
        aria-hidden
        radius="3xl"
        className={cn(
          "pointer-events-none absolute inset-0",
          `bg-${color}-400/40`,
        )}
      />
      <div className="relative flex h-full flex-col p-3">
        {/* Header */}
        <div className="flex justify-between mb-3 items-center mx-1 gap-2">
          <div className="flex gap-2.5 items-center ml-1 min-w-0 flex-1">
            <img
              className="size-8 rounded-full bg-cover cursor-pointer"
              src={`https://s3.newsnext.pro/icons/${provider}.png`}
              title={desc || name}
              onClick={() => window.open(home || "#", "_blank")}
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = getFavicon(home || "#")!
              }}
            />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 min-w-0 w-full">
                {(title || name) && (
                  <span
                    className={cn(
                      "font-bold truncate min-w-0",
                      title && name ? "shrink-0 max-w-[min(14rem,60%)]" : "w-full",
                    )}
                  >
                    {title || name}
                  </span>
                )}
                {title && name && (
                  <span
                    className={cn(
                      "inline-block min-w-0 flex-1 truncate text-sm px-1 rounded-3xl text-center bg-background/50 opacity-80",
                      `text-${color}-400`,
                    )}
                  >
                    {name.replace(/\s+/g, " ")}
                  </span>
                )}
              </div>
              <span className="text-xs opacity-70">
                {isFetching ? "Updating..." : relativeTime}
              </span>
            </div>
          </div>
          <div className={cn("flex gap-1 items-center shrink-0", `text-${color}-400`)} onClick={e => e.stopPropagation()}>
            <IconButton
              className={cn(
                isFetching && "animate-spin",
              )}
              onClick={onRefresh}
              aria-label="Refresh"
            >
              {isFetching ? <PhCircleDashedDuotone /> : <PhArrowCounterClockwiseDuotone />}
            </IconButton>
            <IconButton
              onClick={onToggleStar}
              aria-label="Star"
            >
              {isStarred ? <PhStarFill /> : <PhStarDuotone />}
            </IconButton>
            <IconButton
              onClick={onFlip}
              aria-label="Datail"
            >
              <PhInfoDuotone />
            </IconButton>
            {dragHandle}
          </div>
        </div>

        {/* Content */}
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <SquircleBox
            aria-hidden
            radius="2xl"
            className={cn(
              "pointer-events-none absolute inset-0 bg-background/70",
              `sprinkle-${color}-400`,
            )}
          />
          <div
            ref={ref}
            onPointerDown={event => event.stopPropagation()}
            className={cn(
              "relative size-full overflow-y-auto px-2 py-2 scrollbar-hidden",
              isFetching && `animate-pulse`,
            )}
          >
            <div className={cn("transition-opacity-500", isFetching && "opacity-20")}>
              {type === "hottest"
                ? (
                    <Hottest
                      items={items}
                      color={color}
                      scrollRef={ref as React.RefObject<HTMLDivElement>}
                      previewSelection={previewSelection}
                    />
                  )
                : (
                    <Timeline
                      color={color}
                      items={items}
                      relativeUpdatedTime={relativeTime}
                      scrollRef={ref as React.RefObject<HTMLDivElement>}
                      previewSelection={previewSelection}
                    />
                  )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
