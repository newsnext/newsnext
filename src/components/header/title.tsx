import type { RefObject } from "react"
import { motion, useScroll, useTransform } from "motion/react"
import { useCallback } from "react"
import { Logo } from "../icons/logo"

interface TitleProps {
  scrollContainerRef?: RefObject<HTMLElement | null>
}

export function Title({ scrollContainerRef }: TitleProps) {
  const { scrollYProgress, scrollY } = useScroll({
    container: scrollContainerRef,
  })

  // Only show opacity when scroll height > 150% of screen height
  const opacity = useTransform(scrollY, (value) => {
    const screenHeight = window.innerHeight
    const threshold = screenHeight * 0.1
    if (value < threshold) return 0
    // Fade in over the next 10% of screen height
    const fadeRange = screenHeight * 0.1
    return Math.min((value - threshold) / fadeRange, 1)
  })

  const handleScrollToTop = useCallback(() => {
    const container = scrollContainerRef?.current
    if (container) {
      container.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [scrollContainerRef])

  return (
    <button
      onClick={handleScrollToTop}
      className="island-pill relative flex gap-2 items-center px-4 hover:bg-black/30 shrink-0 pointer-events-auto cursor-pointer"
    >
      <svg className="absolute inset-0 size-full pointer-events-none">
        <motion.rect
          x="1"
          y="1"
          style={{
            width: "calc(100% - 2px)",
            height: "calc(100% - 2px)",
            pathLength: scrollYProgress,
            opacity,
          }}
          rx="19"
          ry="19"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          className="text-theme-400"
        />
      </svg>
      <Logo className="text-theme-400/80 size-5" />
      <span className="text-xl font-brand font-bold whitespace-nowrap">
        News
        <span className="text-theme-400">N</span>
        ext
      </span>
    </button>
  )
}
