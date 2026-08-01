import type { BoardSource } from "@/typings/source"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { cn } from "@/lib/utils"

interface CardSurfaceProps {
  color: BoardSource["provider"]["color"]
  className?: string
}

export function CardSurface({ color, className }: CardSurfaceProps): React.JSX.Element {
  return (
    <SquircleBox
      aria-hidden
      radius="3xl"
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{ backgroundColor: `color-mix(in oklab, var(--background) 40%, var(--color-${color}-400) 60%)` }}
    />
  )
}
