import type { RefObject } from "react"
import { useCallback, useEffect, useLayoutEffect, useRef } from "react"

interface Position {
  x: number
  y: number
  column: number
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
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  const animateLayout = useCallback((columnChangesOnly: boolean) => {
    const list = listRef.current
    if (!list) return
    const animations = animationsRef.current
    const positions = new Map<HTMLElement, Position>()
    const movements: { element: HTMLElement, x: number, y: number }[] = []
    const shouldAnimate = enabledRef.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let rowTop: number | undefined
    let column = 0

    // Batch geometry reads before cancelling or starting any animations.
    for (const element of list.querySelectorAll<HTMLElement>("[data-live-card-id]")) {
      const x = element.offsetLeft
      const y = element.offsetTop
      column = y === rowTop ? column + 1 : 0
      rowTop = y
      const position = { x, y, column }
      positions.set(element, position)
      const previous = positionsRef.current.get(element)
      if (!shouldAnimate || !previous) continue
      if (columnChangesOnly && previous.column === column) continue
      const transform = animations.has(element)
        ? new DOMMatrixReadOnly(getComputedStyle(element).transform)
        : null
      const deltaX = previous.x - x + (transform?.m41 ?? 0)
      const deltaY = previous.y - y + (transform?.m42 ?? 0)
      if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) movements.push({ element, x: deltaX, y: deltaY })
    }
    positionsRef.current = positions
    if (movements.length === 0 && shouldAnimate) return
    for (const animation of animations.values()) animation.cancel()
    animations.clear()
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
  }, [listRef])

  useLayoutEffect(() => animateLayout(false), [animateLayout, enabled, orderKey])

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const animations = animationsRef.current
    // Resizing moves the grid immediately; animate only cards that change columns.
    const observer = new ResizeObserver(() => animateLayout(true))
    observer.observe(list)
    return () => {
      observer.disconnect()
      for (const animation of animations.values()) animation.cancel()
      animations.clear()
      positionsRef.current.clear()
    }
  }, [animateLayout, listRef])
}
