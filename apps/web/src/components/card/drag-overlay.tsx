import type { SourceParamValues } from "@/lib/source-params"
import type { BoardSource } from "@/typings/source"
import { getFavicon } from "@newsnext/shared/utils"
import { isIOS } from "react-device-detect"
import { resolveSourceDisplay } from "@/lib/source-display"
import { cn } from "@/lib/utils"
import { IconButton } from "../common/button"
import { PhDotsSixVerticalDuotone } from "../icons/ph"

interface DragOverlayProps {
  source: BoardSource
  sourceParams: SourceParamValues
}

export function DragOverlay({ source, sourceParams }: DragOverlayProps) {
  const { provider, color, desc } = source
  const { name, title, home } = resolveSourceDisplay(source, sourceParams)
  return (
    <div
      className={cn(
        "flex flex-col p-3",
        `bg-${color}-400/40`,
        !isIOS && "rounded-3xl",
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
                    "inline-block min-w-0 flex-1 truncate text-center text-sm px-1 rounded-3xl bg-background/50 opacity-80",
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
