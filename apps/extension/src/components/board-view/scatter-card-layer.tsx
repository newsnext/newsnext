import type { PropsWithChildren } from "react"
import { useScrollProgressContext } from "@newsnext/ui/components/scroll-progress-context"
import { cn } from "@newsnext/ui/lib/utils"
import { useEffectEvent, useLayoutEffect, useRef } from "react"

const EXIT_DURATION_MS = 320
const ENTRANCE_DURATION_MS = 420
const ENTRANCE_DELAY_MS = 80
const SCATTER_STAGGER_MS = 10
const HORIZONTAL_EXIT_PADDING = 80

interface ScatterCardLayerProps {
  className?: string
  itemSelector: string
  onEnterComplete: () => void
  onExitComplete: () => void
  viewReady: boolean
  state: "active" | "outgoing"
}

interface Bounds {
  bottom: number
  left: number
  right: number
  top: number
}

function getVisibleBounds(rect: DOMRect): Bounds {
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
  onEnterComplete,
  onExitComplete,
  state,
  viewReady,
}: PropsWithChildren<ScatterCardLayerProps>) {
  const { rootScrollContainerRef } = useScrollProgressContext()
  const animationsRef = useRef<Animation[]>([])
  const enteredRef = useRef(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const completeTransition = useEffectEvent((outgoing: boolean) => {
    const root = rootRef.current
    if (!root) return
    root.style.visibility = outgoing ? "hidden" : "visible"
    root.dataset.cardTransitionState = outgoing ? "exited" : "entered"
    if (outgoing) {
      onExitComplete()
    } else {
      enteredRef.current = true
      onEnterComplete()
    }
  })

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return

    const outgoing = state === "outgoing"
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (!outgoing && !viewReady && !reducedMotion) return
    if (!outgoing && enteredRef.current) return

    root.dataset.cardTransitionState = outgoing ? "exiting" : "entering"

    // Capture the entrance before cancelling it so an interrupting exit
    // continues from the visible position instead of snapping back to the slot.
    const candidates = Array.from(root.querySelectorAll<HTMLElement>(itemSelector))
    const interrupted = animationsRef.current.length > 0
    const currentFrames = outgoing && interrupted
      ? new Map(candidates.map((item) => {
          const style = getComputedStyle(item)
          return [item, { opacity: style.opacity, transform: style.transform }]
        }))
      : undefined
    animationsRef.current.forEach(animation => animation.cancel())
    animationsRef.current = []

    if (reducedMotion || (outgoing && !viewReady)) {
      completeTransition(outgoing)
      return
    }

    const rootRect = root.getBoundingClientRect()
    const bounds = getVisibleBounds(rootRect)
    const scrollBounds = rootScrollContainerRef.current?.getBoundingClientRect()
    if (scrollBounds) {
      bounds.top = Math.max(bounds.top, scrollBounds.top)
      bounds.bottom = Math.min(bounds.bottom, scrollBounds.bottom)
      bounds.left = Math.max(bounds.left, scrollBounds.left)
      bounds.right = Math.min(bounds.right, scrollBounds.right)
    }
    // Read all resting geometry before pinning the root or starting animations.
    const items = candidates.flatMap((item) => {
      const rect = item.getBoundingClientRect()
      if (!isVisible(rect, bounds)) return []
      const style = getComputedStyle(item)
      return [{ item, rect, opacity: style.opacity, transform: style.transform }]
    }).sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left)

    // Pin the departing view before the incoming view restores shared scroll.
    if (outgoing) {
      const top = Math.max(0, bounds.top - rootRect.top)
      const right = Math.max(0, rootRect.right - bounds.right)
      const bottom = Math.max(0, rootRect.bottom - bounds.bottom)
      const left = Math.max(0, bounds.left - rootRect.left)
      Object.assign(root.style, {
        position: "fixed",
        top: `${rootRect.top}px`,
        left: `${rootRect.left}px`,
        width: `${rootRect.width}px`,
        height: `${rootRect.height}px`,
        clipPath: `inset(${top}px ${right}px ${bottom}px ${left}px)`,
      })
    }
    const animations = items.map(({ item, rect, opacity, transform }, index) => {
      const baseTransform = transform === "none" ? "" : transform
      const offsetX = getHorizontalExitOffset(rect, bounds, index)
      const restingFrame = { opacity, transform }
      const scatteredFrame = {
        opacity: 0,
        transform: `${baseTransform} translate3d(${offsetX}px, 0, 0)`,
      }
      const startFrame = currentFrames?.get(item) ?? (outgoing ? restingFrame : scatteredFrame)

      return item.animate(
        [startFrame, outgoing ? scatteredFrame : restingFrame],
        {
          delay: interrupted ? 0 : (outgoing ? 0 : ENTRANCE_DELAY_MS) + index * SCATTER_STAGGER_MS,
          duration: outgoing ? EXIT_DURATION_MS : ENTRANCE_DURATION_MS,
          easing: outgoing ? "cubic-bezier(0.4, 0, 1, 1)" : "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "both",
        },
      )
    })
    animationsRef.current = animations
    root.style.visibility = "visible"

    void Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
      if (animationsRef.current !== animations) return
      if (!outgoing) {
        animationsRef.current = []
        animations.forEach(animation => animation.cancel())
      }
      completeTransition(outgoing)
    })
  }, [itemSelector, rootScrollContainerRef, state, viewReady])

  useLayoutEffect(() => () => {
    const animations = animationsRef.current
    animationsRef.current = []
    animations.forEach(animation => animation.cancel())
  }, [])

  const inactive = state !== "active" || !viewReady

  return (
    <div
      ref={rootRef}
      data-card-transition-state="pending"
      style={{ visibility: "hidden" }}
      inert={inactive}
      aria-hidden={inactive}
      className={cn(inactive && "pointer-events-none", className)}
    >
      {children}
    </div>
  )
}
