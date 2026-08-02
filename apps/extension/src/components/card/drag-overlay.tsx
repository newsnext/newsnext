import type { BoardSource } from "@/typings/source"
import { Button } from "@newsnext/ui/components/button"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { useSourceIcon } from "@/hooks/use-source-icon"
import { cn } from "@/lib/utils"
import { PhDotsSixVerticalDuotone } from "../icons/ph"
import { SourceIcon } from "./source-icon"

interface DragOverlayProps {
  source: BoardSource
}

export function DragOverlay({ source }: DragOverlayProps) {
  const { provider } = source
  const { badge, title } = source.metadata
  const { color } = provider
  const icon = useSourceIcon(source)
  return (
    <div className="relative p-2.5">
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
            className="rounded-full cursor-grabbing"
            color={color}
            icon={icon}
            size="default"
            title={title || provider.title}
          />
          <div className="flex flex-col min-w-0">
            <span className="w-full min-w-0 truncate font-bold">
              {title || provider.title}
            </span>
            <span className="text-xs opacity-70">Dragging</span>
          </div>
        </div>
        <Button
          variant="quiet"
          size="icon-fit"
          aria-label="Handle"
          className={cn("shrink-0 cursor-grabbing", `text-${color}-400`)}
        >
          <PhDotsSixVerticalDuotone />
        </Button>
      </div>
    </div>
  )
}
