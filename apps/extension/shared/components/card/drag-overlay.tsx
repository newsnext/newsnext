import type { FeedParamValues } from "@/lib/feed-params"
import type { BoardFeed } from "@/typings/feed"
import { getFavicon } from "@newsnext/shared/utils"
import { isIOS } from "react-device-detect"
import { resolveFeedDisplay } from "@/lib/feed-display"
import { cn } from "@/lib/utils"
import { IconButton } from "../common/button"
import { PhDotsSixVerticalDuotone } from "../icons/ph"

interface DragOverlayProps {
  feed: BoardFeed
  feedParams: FeedParamValues
}

export function DragOverlay({ feed, feedParams }: DragOverlayProps) {
  const { provider, color, desc } = feed
  const { name, title, home } = resolveFeedDisplay(feed, feedParams)
  return (
    <div
      className={cn(
        "flex flex-col p-3",
        `bg-${color}-400/40`,
        !isIOS && "rounded-4xl",
      )}
    >
      <div className="flex justify-between items-center mx-1 gap-2">
        <div className="flex gap-2.5 items-center ml-1 min-w-0 flex-1">
          <img
            className="size-8 rounded-full bg-cover cursor-grabbing"
            src={`https://s3.newsnext.pro/icons/${provider}.png`}
            title={desc || name}
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
                    "inline-block min-w-0 flex-1 truncate text-sm px-1 rounded-3xl bg-background/50 opacity-80",
                    `text-${color}-400`,
                  )}
                >
                  {name.replace(/\s+/g, " ")}
                </span>
              )}
            </div>
            <span className="text-xs opacity-70">Dragging</span>
          </div>
        </div>
        <div className={cn("flex gap-1 items-center shrink-0", `text-${color}-400`)}>
          <div className="flex items-center justify-center cursor-grabbing">
            <IconButton aria-label="Handle">
              <PhDotsSixVerticalDuotone />
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  )
}
