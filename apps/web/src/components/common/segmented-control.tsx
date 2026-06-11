import type { ReactNode } from "react"
import { cn } from "@newsnext/ui/lib/utils"
import { m } from "motion/react"

export interface SegmentedControlItem<T> {
  value: T
  label: ReactNode
}

interface SegmentedControlProps<T extends string> {
  items: readonly SegmentedControlItem<T>[]
  value: T
  onValueChange: (value: T) => void
  className?: string
  itemClassName?: string
  indicatorClassName?: string
  layoutId?: string
}

export function SegmentedControlIndicator({
  layoutId,
  className,
}: {
  layoutId: string
  className?: string
}) {
  return (
    <m.div
      layoutId={layoutId}
      className={cn("absolute inset-0 bg-theme-500 rounded-full shadow-md", className)}
      transition={{
        type: "spring",
        stiffness: 380,
        damping: 30,
      }}
    />
  )
}

export function SegmentedControl<T extends string>({
  items,
  value,
  onValueChange,
  className,
  itemClassName,
  indicatorClassName,
  layoutId = "segmented-control",
}: SegmentedControlProps<T>) {
  return (
    <div className={cn("island-pill flex gap-2 items-center p-1 rounded-full w-fit", className)}>
      {items.map((item) => {
        const isActive = value === item.value
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onValueChange(item.value)}
            className={cn(
              "relative px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors outline-none cursor-pointer",
              isActive ? "text-white" : "text-muted-foreground hover:text-foreground",
              itemClassName,
            )}
          >
            {isActive && (
              <SegmentedControlIndicator layoutId={layoutId} className={indicatorClassName} />
            )}
            <span className="relative z-10">{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
