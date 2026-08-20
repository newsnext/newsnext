import type { MotionValue } from "motion/react"
import type { MouseEvent } from "react"
import { useScrollProgressContext } from "@newsnext/ui/components/scroll-progress-context"
import { useLocation, useRouter } from "@tanstack/react-router"
import { useMotionValue } from "motion/react"
import { useCallback, useLayoutEffect, useRef, useState } from "react"
import { getBoardLayerFromState } from "@/lib/board"

const SCROLL_THRESHOLD_VIEWPORT_RATIO = 0.1

export interface HeaderProgressState {
  handleScrollToTop: (event: MouseEvent) => void
  isAtTop: boolean
  isNextLayer: boolean
  opacity: MotionValue<number>
  scrollYProgress: MotionValue<number>
}

export function useHeaderProgress(): HeaderProgressState {
  const { rootScrollContainer, rootScrollContainerRef } = useScrollProgressContext()
  const router = useRouter()
  const { isNextLayer, routeHref } = useLocation({
    select: location => ({
      routeHref: location.href,
      isNextLayer: getBoardLayerFromState(location.state) === "next",
    }),
  })
  const [isAtTop, setIsAtTop] = useState(true)
  const isAtTopRef = useRef(true)
  const opacity = useMotionValue(0)
  const scrollYProgress = useMotionValue(0)

  const syncProgress = useCallback((container: HTMLElement | null) => {
    if (!container) return

    const scrollTop = container.scrollTop
    const threshold = window.innerHeight * SCROLL_THRESHOLD_VIEWPORT_RATIO
    const nextIsAtTop = scrollTop < threshold
    const scrollRange = container.scrollHeight - container.clientHeight

    if (nextIsAtTop !== isAtTopRef.current) {
      isAtTopRef.current = nextIsAtTop
      setIsAtTop(nextIsAtTop)
    }

    opacity.set(nextIsAtTop ? 0 : Math.min((scrollTop - threshold) / threshold, 1))
    scrollYProgress.set(scrollRange > 0
      ? Math.min(Math.max(scrollTop / scrollRange, 0), 1)
      : 0)
  }, [opacity, scrollYProgress])

  const handleScrollToTop = (event: MouseEvent) => {
    event.stopPropagation()
    rootScrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }

  useLayoutEffect(() => {
    const container = rootScrollContainer
    if (!container) return

    const handleScroll = () => syncProgress(container)
    const resizeObserver = new ResizeObserver(handleScroll)

    handleScroll()
    container.addEventListener("scroll", handleScroll, { passive: true })
    resizeObserver.observe(container)
    if (container.firstElementChild) {
      resizeObserver.observe(container.firstElementChild)
    }
    let animationFrameId = 0
    const syncOnNextFrame = () => {
      window.cancelAnimationFrame(animationFrameId)
      animationFrameId = window.requestAnimationFrame(handleScroll)
    }
    syncOnNextFrame()
    window.addEventListener("pageshow", syncOnNextFrame)
    let disposed = false
    const unsubscribeFromRendered = router.subscribe("onRendered", () => {
      queueMicrotask(() => {
        if (!disposed) handleScroll()
      })
    })

    return () => {
      disposed = true
      window.cancelAnimationFrame(animationFrameId)
      window.removeEventListener("pageshow", syncOnNextFrame)
      container.removeEventListener("scroll", handleScroll)
      resizeObserver.disconnect()
      unsubscribeFromRendered()
    }
  }, [rootScrollContainer, routeHref, router, syncProgress])

  return {
    handleScrollToTop,
    isAtTop,
    isNextLayer,
    opacity,
    scrollYProgress,
  }
}
