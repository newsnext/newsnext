import { SquircleBox } from "@newsnext/ui/components/squircle"
import { cn } from "@/lib/utils"

interface LiveCardSurfaceProps {
  className?: string
}

export function LiveCardSurface({ className }: LiveCardSurfaceProps): React.JSX.Element {
  return (
    <SquircleBox
      aria-hidden
      data-live-card-surface
      radius="3xl"
      className={cn(
        "pointer-events-none absolute inset-0 bg-theme-400/45",
        className,
      )}
    />
  )
}
