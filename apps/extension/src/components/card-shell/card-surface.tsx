import { SquircleBox } from "@newsnext/ui/components/squircle"
import { cn } from "@newsnext/ui/lib/utils"

// Outer shell: 3xl squircle at theme-400/45 (no ring; layered translucency
// is the boundary). Inner 2xl panel composed by callers.
interface CardSurfaceProps {
  className?: string
}

export function CardSurface({ className }: CardSurfaceProps): React.JSX.Element {
  return (
    <SquircleBox
      aria-hidden
      data-card-surface
      radius="3xl"
      className={cn(
        "pointer-events-none absolute inset-0 bg-theme-400/45",
        className,
      )}
    />
  )
}
