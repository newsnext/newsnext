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
        "pointer-events-none absolute inset-0 bg-[color-mix(in_oklab,var(--background),var(--color-theme-400)_55%)]",
        className,
      )}
    />
  )
}
