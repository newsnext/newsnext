import type { RefObject } from "react"
import { useEffect, useLayoutEffect, useRef } from "react"

interface Position {
  x: number
  y: number
}

// Animate the outer slots independently of the nested navigation transitions.
export function useSortableLayoutAnimation(
  listRef: RefObject<HTMLOListElement | null>,
  order: readonly string[],
  enabled: boolean,
): void {
  const orderKey = JSON.stringify(order)
  const positionsRef = useRef(new Map<HTMLElement, Position>())
  const animationsRef = useRef(new Map<HTMLElement, Animation>())

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    const animations = animationsRef.current
    const positions = new Map<HTMLElement, Position>()
    const movements: { element: HTMLElement, x: number, y: number }[] = []
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    // Batch geometry reads before cancelling or starting any animations.
    for (const element of list.querySelectorAll<HTMLElement>("[data-live-card-id]")) {
      const position = { x: element.offsetLeft, y: element.offsetTop }
      positions.set(element, position)
      const previous = positionsRef.current.get(element)
      if (!enabled || reducedMotion || !previous) continue
      const transform = animations.has(element)
        ? new DOMMatrixReadOnly(getComputedStyle(element).transform)
        : null
      const x = previous.x - position.x + (transform?.m41 ?? 0)
      const y = previous.y - position.y + (transform?.m42 ?? 0)
      if (Math.abs(x) > 0.5 || Math.abs(y) > 0.5) movements.push({ element, x, y })
    }
    for (const animation of animations.values()) animation.cancel()
    animations.clear()
    positionsRef.current = positions
    for (const { element, x, y } of movements) {
      const animation = element.animate([
        { transform: `translate(${x}px, ${y}px)` },
        { transform: "translate(0, 0)" },
      ], { duration: 180, easing: "ease" })
      animations.set(element, animation)
      animation.onfinish = () => {
        if (animations.get(element) === animation) animations.delete(element)
      }
    }
  }, [enabled, listRef, orderKey])

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const animations = animationsRef.current
    const observer = new ResizeObserver(() => {
      // Viewport reflow changes the resting geometry without changing user order.
      for (const element of list.querySelectorAll<HTMLElement>("[data-live-card-id]")) {
        positionsRef.current.set(element, { x: element.offsetLeft, y: element.offsetTop })
      }
    })
    observer.observe(list)
    return () => {
      observer.disconnect()
      for (const animation of animations.values()) animation.cancel()
      animations.clear()
      positionsRef.current.clear()
    }
  }, [listRef])
}
