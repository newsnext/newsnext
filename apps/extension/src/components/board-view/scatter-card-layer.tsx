import type { PropsWithChildren } from "react"
import { useScrollProgressContext } from "@newsnext/ui/components/scroll-progress-context"
import { cn } from "@newsnext/ui/lib/utils"
import { useEffectEvent, useLayoutEffect, useRef } from "react"

const SCATTER_DURATION_MS = 320
const SCATTER_STAGGER_MS = 10
const SCATTER_MAX_DELAY_MS = 40
const HORIZONTAL_EXIT_PADDING = 200

// A fresh document gets one entrance, even if routing later remounts BoardView.
let initialEntranceClaimed = false

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
  onEnterComplete,
  onExitComplete,
  state,
  viewReady,
}: PropsWithChildren<ScatterCardLayerProps>) {
  const { rootScrollContainerRef } = useScrollProgressContext()
  const animationsRef = useRef<Animation[]>([])
  const animateEntranceRef = useRef<boolean | null>(null)
  const enteredRef = useRef(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const completeTransition = useEffectEvent((outgoing: boolean) => {
    const root = rootRef.current
    if (!root) return
    root.style.visibility = outgoing ? "hidden" : "visible"
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

    if (animateEntranceRef.current === null) {
      animateEntranceRef.current = !initialEntranceClaimed
      initialEntranceClaimed = true
    }

    const outgoing = state === "outgoing"
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (!outgoing && !viewReady && !reducedMotion) return
    if (!outgoing && enteredRef.current && animationsRef.current.length === 0) return
    if (outgoing) {
      enteredRef.current = false
      animateEntranceRef.current = false
    }

    // Capture the initial entrance before cancelling it so an interrupting exit
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

    if (reducedMotion || (outgoing && !viewReady) || (!outgoing && !animateEntranceRef.current)) {
      completeTransition(outgoing)
      return
    }

    const bounds = getVisibleBounds(root)
    const scrollBounds = rootScrollContainerRef.current?.getBoundingClientRect()
    if (scrollBounds) {
      bounds.top = Math.max(bounds.top, scrollBounds.top)
      bounds.bottom = Math.min(bounds.bottom, scrollBounds.bottom)
      bounds.left = Math.max(bounds.left, scrollBounds.left)
      bounds.right = Math.min(bounds.right, scrollBounds.right)
    }
    const items = candidates.filter(item => isVisible(item.getBoundingClientRect(), bounds))
    const animations = items.map((item, index) => {
      const style = getComputedStyle(item)
      const baseTransform = style.transform === "none" ? "" : style.transform
      const offsetX = getHorizontalExitOffset(item.getBoundingClientRect(), bounds, index)
      const restingFrame = { opacity: style.opacity, transform: style.transform }
      const scatteredFrame = {
        opacity: 0,
        transform: `${baseTransform} translate3d(${offsetX}px, 0, 0)`,
      }
      const startFrame = currentFrames?.get(item) ?? (outgoing ? restingFrame : scatteredFrame)

      return item.animate(
        [startFrame, outgoing ? scatteredFrame : restingFrame],
        {
          delay: interrupted ? 0 : Math.min(index * SCATTER_STAGGER_MS, SCATTER_MAX_DELAY_MS),
          duration: SCATTER_DURATION_MS,
          easing: outgoing ? "cubic-bezier(0.4, 0, 1, 1)" : "cubic-bezier(0, 0, 0.6, 1)",
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

  return (
    <div
      ref={rootRef}
      style={{ visibility: "hidden" }}
      aria-hidden={state !== "active" || !viewReady}
      className={cn((state !== "active" || !viewReady) && "pointer-events-none", className)}
    >
      {children}
    </div>
  )
}
