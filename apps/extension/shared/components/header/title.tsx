import type { RefObject } from "react"
import { motion, useScroll, useTransform } from "motion/react"
import { useCallback } from "react"
import { ThemeSelector } from "../common/theme-selector"
import DynamicIsland from "../dynamic-island"
import { Logo } from "../icons/logo"

interface HeaderProgressProps {
  scrollContainerRef?: RefObject<HTMLElement | null>
}

function HeaderProgress({ scrollContainerRef }: HeaderProgressProps) {
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

  // TODO: Add scroll to top functionality
  // oxlint-disable-next-line no-unused-vars
  const handleScrollToTop = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const container = scrollContainerRef?.current
    if (container) {
      container.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [scrollContainerRef])

  return (
    <div className="flex items-center gap-2 size-full justify-center">
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
          strokeLinejoin="round"
          className="text-theme-400"
        />
      </svg>
      <Logo className="text-theme-500 size-5" />
      <span
        // onClick={handleScrollToTop}
        className="text-xl font-brand font-bold whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity"
      >
        News
        <span className="text-theme-400">N</span>
        ext
      </span>
    </div>
  )
}

interface TitleIslandProps {
  scrollContainerRef?: RefObject<HTMLElement | null>
  width?: number
}

export function TitleIsland({ scrollContainerRef, width = 150 }: TitleIslandProps) {
  return (
    <>
      {/* Placeholder */}
      <div className="h-11 shrink-0" style={{ width: `${width}px` }} />

      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
        <DynamicIsland
          top={0}
          smallClassName="island-pill relative flex gap-2 items-center px-4 hover:bg-black/30 shrink-0 pointer-events-auto cursor-pointer"
          largeClassName="p-3 sprinkle-theme-400 rounded-2xl pointer-events-auto"
          smallHeight={44}
          smallWidth={width}
          largeWidth={300}
          largeHeight={160}
        >
          {(isSmall, helpers) =>
            isSmall
              ? (
                  <HeaderProgress scrollContainerRef={scrollContainerRef} />
                )
              : (
                  <ThemeSelector onClose={helpers.close} />
                )}
        </DynamicIsland>
      </div>
    </>
  )
}
