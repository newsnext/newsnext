import { isIOS } from "react-device-detect"
import { cn } from "@/lib/utils"
import { PhDotsSixVerticalDuotone } from "../icons/ph"
import { Button } from "../ui/button"
import { MOCK_SOURCES } from "./mock-data"

interface DragOverlayProps {
  id: string
}

export function DragOverlay({ id }: DragOverlayProps) {
  const source = MOCK_SOURCES[id] || MOCK_SOURCES["36kr"]
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl p-4 backdrop-blur-sm",
        `bg-${source.color}-400/40`,
        !isIOS && "rounded-2xl",
      )}
    >
      <div className="flex justify-between items-center mx-2">
        <div className="flex gap-2.5 items-center">
          <div
            className="size-8 rounded-full bg-cover"
            style={{
              backgroundImage: `url(/icons/${id}.png)`,
            }}
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">
                {source.name}
              </span>
              {source.title && (
                <span className={cn("text-sm px-1 rounded bg-background/50 opacity-80", `text-${source.color}-400`)}>
                  {source.title}
                </span>
              )}
            </div>
            <span className="text-xs opacity-70">Dragging</span>
          </div>
        </div>
        <div className={cn("flex gap-1 items-center shrink-0", `text-${source.color}-400`)}>
          <div className="flex items-center justify-center cursor-grabbing">
            <Button
              variant="icon"
              size="icon"
              aria-label="Handle"
              asChild
            >
              <PhDotsSixVerticalDuotone />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
