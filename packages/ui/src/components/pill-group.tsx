import { cn } from "@newsnext/ui/lib/utils"
import { useLayoutEffect, useRef } from "react"

interface PillGroupItemClassNameOptions {
  active?: boolean
  className?: string
}

export function PillGroup({
  children,
  className,
  indicator = true,
  ...props
}: React.ComponentProps<"div"> & { indicator?: boolean }): React.JSX.Element {
  return (
    <div
      data-slot="pill-group"
      className={cn("island-pill relative flex w-fit items-center gap-1 p-1 text-xs leading-[18px] text-inherit", className)}
      {...props}
    >
      {indicator && <PillGroupIndicator />}
      {children}
    </div>
  )
}

export function pillGroupItemClassName({
  active,
  className,
}: PillGroupItemClassNameOptions = {}): string {
  return cn(
    "relative inline-flex min-w-0 cursor-pointer items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-theme-400 active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
    active === true && "text-primary-foreground",
    active === false && "text-muted-foreground hover:text-foreground",
    active === undefined && "text-muted-foreground hover:text-foreground data-checked:text-primary-foreground",
    className,
  )
}

export function PillGroupIndicator(): React.JSX.Element {
  const indicatorRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const indicator = indicatorRef.current
    const container = indicator?.parentElement
    if (!indicator || !container) return

    const update = (): void => {
      const activeItem = container.querySelector<HTMLElement>("[aria-current=page], [data-checked]")
      if (!activeItem) return
      indicator.style.width = `${activeItem.offsetWidth}px`
      indicator.style.transform = `translate3d(${activeItem.offsetLeft}px, 0, 0)`
      if (!indicator.hasAttribute("data-ready")) {
        void indicator.offsetWidth
        indicator.dataset.ready = ""
      }
    }

    update()
    const mutationObserver = new MutationObserver(update)
    mutationObserver.observe(container, {
      attributeFilter: ["aria-current", "data-checked"],
      attributes: true,
      childList: true,
      subtree: true,
    })
    const resizeObserver = new ResizeObserver(update)
    resizeObserver.observe(container)

    return () => {
      mutationObserver.disconnect()
      resizeObserver.disconnect()
    }
  }, [])

  return (
    <span
      ref={indicatorRef}
      aria-hidden
      data-slot="pill-group-indicator"
      className="pointer-events-none absolute inset-y-1 left-0 rounded-full bg-primary shadow-md will-change-transform data-[ready]:transition-[transform,width] data-[ready]:duration-300 data-[ready]:ease-out motion-reduce:transition-none"
    />
  )
}
