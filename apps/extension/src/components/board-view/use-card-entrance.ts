import type { RefObject } from "react"
import { useLayoutEffect } from "react"

const CARD_ENTRANCE_DURATION_MS = 200
const CARD_ENTRANCE_STAGGER_MS = 60

interface UseCardEntranceOptions {
  active: boolean
  containerRef: RefObject<HTMLElement | null>
  itemSelector: string
  onComplete?: () => void
  scrollContainerRef: RefObject<HTMLElement | null>
}

function isVisible(element: HTMLElement, bounds: DOMRect): boolean {
  const rect = element.getBoundingClientRect()
  return rect.bottom > bounds.top
    && rect.top < bounds.bottom
    && rect.right > bounds.left
    && rect.left < bounds.right
}

export function useCardEntrance({
  active,
  containerRef,
  itemSelector,
  onComplete,
  scrollContainerRef,
}: UseCardEntranceOptions): void {
  useLayoutEffect(() => {
    if (!active) return

    const container = containerRef.current
    const scrollContainer = scrollContainerRef.current
    if (!container || !scrollContainer) {
      onComplete?.()
      return
    }

    const items = Array.from(container.querySelectorAll<HTMLElement>(itemSelector))
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      items.forEach(item => item.classList.remove("layer-card-entrance-pending"))
      onComplete?.()
      return
    }

    const bounds = scrollContainer.getBoundingClientRect()
    const visibleItems = items.filter(item => isVisible(item, bounds))
    const animations = visibleItems.map((item, index) => item.animate(
      [
        { opacity: 0, transform: "translate3d(0, 20px, 0)" },
        { opacity: 1, transform: "translate3d(0, 0, 0)" },
      ],
      {
        delay: index * CARD_ENTRANCE_STAGGER_MS,
        duration: CARD_ENTRANCE_DURATION_MS,
        easing: "linear",
        fill: "both",
      },
    ))
    items.forEach(item => item.classList.remove("layer-card-entrance-pending"))
    let cancelled = false

    void Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
      if (cancelled) return
      animations.forEach(animation => animation.cancel())
      onComplete?.()
    })

    return () => {
      cancelled = true
      animations.forEach(animation => animation.cancel())
    }
  }, [active, containerRef, itemSelector, onComplete, scrollContainerRef])
}
