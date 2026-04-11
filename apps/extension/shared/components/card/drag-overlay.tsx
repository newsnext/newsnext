import type { BoardFeed } from "@/typings/feed"
import { isIOS } from "react-device-detect"
import { cn } from "@/lib/utils"
import { IconButton } from "../common/button"
import { PhDotsSixVerticalDuotone } from "../icons/ph"

interface DragOverlayProps {
  feed: BoardFeed
}

export function DragOverlay({ feed }: DragOverlayProps) {
  const { provider } = feed
  return (
    <div
      className={cn(
        "flex flex-col p-4 backdrop-blur-md",
        `bg-${feed.color}-400/40`,
        !isIOS && "rounded-2xl",
      )}
    >
      <div className="flex justify-between items-center mx-2">
        <div className="flex gap-2.5 items-center">
          <div
            className="size-8 rounded-full bg-cover"
            style={{
              backgroundImage: `url(https://s3.newsnext.pro/icons/${provider}.png)`,
            }}
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">
                {feed.name}
              </span>
              {feed.title && (
                <span className={cn("text-sm px-1 rounded bg-background/50 opacity-80", `text-${feed.color}-400`)}>
                  {feed.title}
                </span>
              )}
            </div>
            <span className="text-xs opacity-70">Dragging</span>
          </div>
        </div>
        <div className={cn("flex gap-1 items-center shrink-0", `text-${feed.color}-400`)}>
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
