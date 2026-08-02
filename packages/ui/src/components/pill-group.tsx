import { cn } from "@newsnext/ui/lib/utils"
import { m } from "motion/react"

interface PillGroupItemClassNameOptions {
  active?: boolean
  className?: string
}

interface PillGroupIndicatorProps {
  layoutId: string
}

export function PillGroup({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      data-slot="pill-group"
      className={cn("island-pill flex w-fit items-center gap-1 rounded-full p-1", className)}
      {...props}
    />
  )
}

export function pillGroupItemClassName({
  active,
  className,
}: PillGroupItemClassNameOptions = {}): string {
  return cn(
    "relative inline-flex min-w-0 cursor-pointer items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-theme-400 active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
    active === true && "text-white",
    active === false && "text-muted-foreground hover:text-foreground",
    active === undefined && "text-muted-foreground hover:text-foreground data-checked:text-white",
    className,
  )
}

export function PillGroupIndicator({ layoutId }: PillGroupIndicatorProps): React.JSX.Element {
  return (
    <m.span
      aria-hidden
      data-slot="pill-group-indicator"
      layoutId={layoutId}
      className="pointer-events-none absolute inset-0 rounded-full bg-theme-500 shadow-md"
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
    />
  )
}
