import { SquircleBox } from "@newsnext/ui/components/squircle"
import { cn } from "@/lib/utils"

interface CardSurfaceProps {
  className?: string
}

export function CardSurface({ className }: CardSurfaceProps): React.JSX.Element {
  return (
    <SquircleBox
      aria-hidden
      data-card-surface
      radius="3xl"
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{ backgroundColor: "color-mix(in oklab, var(--background), var(--color-theme-400) 55%)" }}
    />
  )
}
