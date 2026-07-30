import type { BoardSource } from "@/typings/source"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { cn } from "@/lib/utils"
import { IconButton } from "../common/button"
import { PhDotsSixVerticalDuotone } from "../icons/ph"
import { SourceIcon } from "./source-icon"

interface DragOverlayProps {
  source: BoardSource
}

export function DragOverlay({ source }: DragOverlayProps) {
  const { badge, provider, title } = source
  const { color, icon } = provider
  return (
    <div className="relative flex flex-col p-3">
      <SquircleBox
        aria-hidden
        radius="3xl"
        className={cn(
          "pointer-events-none absolute inset-0",
          `bg-${color}-400/40`,
        )}
      />
      <div className="relative flex justify-between items-center mx-1 gap-2">
        <div className="flex gap-2.5 items-center ml-1 min-w-0 flex-1">
          <SourceIcon
            badge={badge}
            className="size-8 rounded-full cursor-grabbing"
            color={color}
            icon={icon}
            title={title || provider.title}
          />
          <div className="flex flex-col min-w-0">
            <span className="w-full min-w-0 truncate font-bold">
              {title || provider.title}
            </span>
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
