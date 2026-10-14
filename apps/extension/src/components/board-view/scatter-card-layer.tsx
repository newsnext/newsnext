import type { PropsWithChildren, RefObject } from "react"
import { useScrollProgressContext } from "@newsnext/ui/components/scroll-progress-context"
import { cn } from "@newsnext/ui/lib/utils"
import { useEffectEvent, useLayoutEffect, useRef } from "react"

const TRANSITION_OPTIONS: KeyframeAnimationOptions = {
  duration: 480,
  easing: "cubic-bezier(0.4, 0, 0.2, 1)",
  fill: "both",
}
const ENTRANCE_PHASE_OFFSET_MS = 180
const SCATTER_STAGGER_MS = 15
const HORIZONTAL_EXIT_PADDING = 80
const SHORT_DISTANCE_RATIO = 0.3

export interface BoardTransitionTimeline {
  startTime: number | null
  entranceDelay: number
}

interface ScatterCardLayerProps {
  className?: string
  itemSelector: string
  onEnterComplete: () => void
  onExitComplete: () => void
  ready: boolean
  state: "active" | "outgoing"
  transitionTimelineRef: RefObject<BoardTransitionTimeline>
}

interface Bounds {
  bottom: number
  left: number
  right: number
  top: number
}

function getVisibleBounds(rect: DOMRect, viewport?: DOMRect): Bounds {
  return {
    top: Math.max(rect.top, 0, viewport?.top ?? 0),
    right: Math.min(rect.right, window.innerWidth, viewport?.right ?? window.innerWidth),
    bottom: Math.min(rect.bottom, window.innerHeight, viewport?.bottom ?? window.innerHeight),
    left: Math.max(rect.left, 0, viewport?.left ?? 0),
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

interface LayerMotion {
  state: ScatterCardLayerProps["state"]
  animations: Animation[]
}

function prepareLayerAnimations(
  root: HTMLDivElement,
  scrollContainer: HTMLElement | null,
  itemSelector: string,
  outgoing: boolean,
  previousAnimations: Animation[],
  timeline: BoardTransitionTimeline,
): Animation[] {
  // Capture the entrance before cancelling it so an interrupting exit
  // continues from the visible position instead of snapping back to the slot.
  const candidates = Array.from(root.querySelectorAll<HTMLElement>(itemSelector))
  const interrupted = previousAnimations.length > 0
  const currentRootOpacity = outgoing && interrupted ? getComputedStyle(root).opacity : "1"
  const currentFrames = outgoing && interrupted
    ? new Map(candidates.map((item) => {
        const style = getComputedStyle(item)
        return [item, { opacity: style.opacity, transform: style.transform }]
      }))
    : undefined
  previousAnimations.forEach(animation => animation.cancel())

  const rootRect = root.getBoundingClientRect()
  const bounds = getVisibleBounds(rootRect, scrollContainer?.getBoundingClientRect())
  // Read all resting geometry before pinning the root or starting animations.
  const items = candidates.flatMap((item) => {
    const rect = item.getBoundingClientRect()
    if (!isVisible(rect, bounds)) return []
    const style = getComputedStyle(item)
    return [{ item, rect, opacity: style.opacity, transform: style.transform }]
  }).sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left)
  const firstRowTop = items[0]?.rect.top ?? 0
  const rowSpan = (items.at(-1)?.rect.top ?? firstRowTop) - firstRowTop
  if (outgoing) {
    // Incoming follows the same row order, one phase behind departure on the shared timeline.
    timeline.entranceDelay = items.length === 0 ? 0 : ENTRANCE_PHASE_OFFSET_MS
  }

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
    const rowProgress = rowSpan > 0 ? (rect.top - firstRowTop) / rowSpan : 0
    const distanceProgress = outgoing ? rowProgress : 1 - rowProgress
    const distanceRatio = SHORT_DISTANCE_RATIO + (1 - SHORT_DISTANCE_RATIO) * distanceProgress
    const offsetX = getHorizontalExitOffset(rect, bounds, index) * distanceRatio
    const restingFrame = { opacity, transform }
    const scatteredFrame = {
      opacity: 0,
      transform: `${baseTransform} translate3d(${offsetX}px, 0, 0)`,
    }
    const startFrame = currentFrames?.get(item) ?? (outgoing ? restingFrame : scatteredFrame)

    return item.animate(
      [startFrame, outgoing ? scatteredFrame : restingFrame],
      {
        ...TRANSITION_OPTIONS,
        delay: (outgoing ? 0 : timeline.entranceDelay) + (interrupted ? 0 : index * SCATTER_STAGGER_MS),
      },
    )
  })
  if (animations.length === 0) {
    animations.push(root.animate(
      [{ opacity: outgoing ? currentRootOpacity : 0 }, { opacity: outgoing ? 0 : 1 }],
      TRANSITION_OPTIONS,
    ))
  }
  // Prepare both views before starting either one; scroll restoration can otherwise split their clocks.
  animations.forEach((animation) => {
    animation.pause()
    animation.currentTime = 0
  })
  return animations
}

export function ScatterCardLayer({
  children,
  className,
  itemSelector,
  onEnterComplete,
  onExitComplete,
  ready,
  state,
  transitionTimelineRef,
}: PropsWithChildren<ScatterCardLayerProps>) {
  const { rootScrollContainerRef } = useScrollProgressContext()
  const motionRef = useRef<LayerMotion | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const completeTransition = useEffectEvent((outgoing: boolean) => {
    const root = rootRef.current
    if (!root) return
    root.style.visibility = outgoing ? "hidden" : "visible"
    root.dataset.cardTransitionState = outgoing ? "exited" : "entered"
    if (outgoing) onExitComplete()
    else onEnterComplete()
  })

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const outgoing = state === "outgoing"
    if (!outgoing && !ready) return

    let motion = motionRef.current
    if (motion?.state !== state) {
      root.dataset.cardTransitionState = outgoing ? "exiting" : "entering"
      const animations = prepareLayerAnimations(
        root,
        rootScrollContainerRef.current,
        itemSelector,
        outgoing,
        motion?.animations ?? [],
        transitionTimelineRef.current,
      )
      const nextMotion = { state, animations }
      motionRef.current = motion = nextMotion
      root.style.visibility = "visible"

      void Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
        if (motionRef.current !== nextMotion) return
        if (!outgoing) {
          nextMotion.animations = []
          animations.forEach(animation => animation.cancel())
        }
        completeTransition(outgoing)
      })
    }

    if (!ready || !motion.animations.length) return
    const timeline = transitionTimelineRef.current
    const timelineTime = document.timeline.currentTime
    timeline.startTime ??= typeof timelineTime === "number" ? timelineTime : performance.now()
    motion.animations.forEach((animation) => {
      if (animation.playState !== "paused") return
      animation.play()
      animation.startTime = timeline.startTime
    })
  }, [itemSelector, ready, rootScrollContainerRef, state, transitionTimelineRef])

  useLayoutEffect(() => () => {
    const motion = motionRef.current
    motionRef.current = null
    motion?.animations.forEach(animation => animation.cancel())
  }, [])

  const inactive = state === "outgoing" || !ready

  return (
    // Starts hidden until resting geometry is measured; preparation reveals the view before playback.
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
