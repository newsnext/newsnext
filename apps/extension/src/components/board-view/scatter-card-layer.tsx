import type { PropsWithChildren } from "react"
import { useLayoutEffect, useRef } from "react"
import { cn } from "@/lib/utils"

const SCATTER_DURATION_MS = 320
const SCATTER_STAGGER_MS = 10
const HORIZONTAL_EXIT_PADDING = 200

interface ScatterCardLayerProps {
  className?: string
  itemSelector: string
  onExitComplete: () => void
  state: "active" | "outgoing"
}

interface Bounds {
  bottom: number
  left: number
  right: number
  top: number
}

function getVisibleBounds(element: HTMLElement): Bounds {
  const rect = element.getBoundingClientRect()
  return {
    top: Math.max(rect.top, 0),
    right: Math.min(rect.right, window.innerWidth),
    bottom: Math.min(rect.bottom, window.innerHeight),
    left: Math.max(rect.left, 0),
  }
}

function isVisible(rect: DOMRect, bounds: Bounds): boolean {
  return rect.bottom > bounds.top
    && rect.top < bounds.bottom
    && rect.right > bounds.left
    && rect.left < bounds.right
}

function getHorizontalExitOffset(rect: DOMRect, bounds: Bounds, index: number): number {
  const centerX = (bounds.left + bounds.right) / 2
  const itemCenterX = rect.left + rect.width / 2
  const isCentered = Math.abs(itemCenterX - centerX) < 1
  const exitsLeft = itemCenterX < centerX || (isCentered && index % 2 === 0)

  return exitsLeft
    ? bounds.left - rect.right - HORIZONTAL_EXIT_PADDING
    : bounds.right - rect.left + HORIZONTAL_EXIT_PADDING
}

export function ScatterCardLayer({
  children,
  className,
  itemSelector,
  onExitComplete,
  state,
}: PropsWithChildren<ScatterCardLayerProps>) {
  const rootRef = useRef<HTMLDivElement>(null)
  const onExitCompleteRef = useRef(onExitComplete)

  useLayoutEffect(() => {
    onExitCompleteRef.current = onExitComplete
  }, [onExitComplete])

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return

    root.style.visibility = "visible"
    if (state === "active") return

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.style.visibility = "hidden"
      onExitCompleteRef.current()
      return
    }

    const bounds = getVisibleBounds(root)
    const items = Array.from(root.querySelectorAll<HTMLElement>(itemSelector))
      .filter(item => isVisible(item.getBoundingClientRect(), bounds))

    const animations = items.map((item, index) => {
      const style = getComputedStyle(item)
      const baseTransform = style.transform === "none" ? "" : style.transform
      const offsetX = getHorizontalExitOffset(item.getBoundingClientRect(), bounds, index)

      return item.animate(
        [
          { opacity: style.opacity, transform: baseTransform },
          {
            opacity: 0,
            transform: `${baseTransform} translate3d(${offsetX}px, 0, 0)`,
          },
        ],
        {
          delay: index * SCATTER_STAGGER_MS,
          duration: SCATTER_DURATION_MS,
          easing: "cubic-bezier(0.4, 0, 1, 1)",
          fill: "forwards",
        },
      )
    })
    let cancelled = false

    void Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
      if (!cancelled) onExitCompleteRef.current()
    })

    return () => {
      cancelled = true
      animations.forEach(animation => animation.cancel())
    }
  }, [itemSelector, state])

  return (
    <div
      ref={rootRef}
      aria-hidden={state !== "active"}
      className={cn(state !== "active" && "pointer-events-none", className)}
    >
      {children}
    </div>
  )
}
