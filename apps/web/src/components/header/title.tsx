import type { RefObject } from "react"
import { AnimatePresence, m, useMotionValue, useMotionValueEvent, useScroll } from "motion/react"
import { useCallback, useState } from "react"
import { useScrollProgressContext } from "@/components/scroll-progress-context"
import { ThemeSelector } from "../common/theme-selector"
import DynamicIsland from "../dynamic-island"
import { Logo } from "../icons/logo"
import { PhArrowFatUpDuotone } from "../icons/ph"
import { WordmarkLogo } from "../icons/wordmark-logo"

interface HeaderProgressProps {
  scrollContainerRef?: RefObject<HTMLElement | null>
}

function HeaderProgress({ scrollContainerRef }: HeaderProgressProps) {
  const {
    nextLayerScrollContainerRef,
    isNextLayerActive,
  } = useScrollProgressContext()

  const rootScroll = useScroll({
    container: scrollContainerRef,
  })
  const nextLayerScroll = useScroll({
    container: nextLayerScrollContainerRef,
  })

  const activeScroll = isNextLayerActive ? nextLayerScroll : rootScroll
  const { scrollYProgress, scrollY } = activeScroll

  const [isAtTop, setIsAtTop] = useState(true)
  const opacity = useMotionValue(0)

  const handleScrollToTop = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const container = isNextLayerActive
      ? nextLayerScrollContainerRef.current
      : scrollContainerRef?.current
    if (container) {
      container.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [nextLayerScrollContainerRef, isNextLayerActive, scrollContainerRef])

  useMotionValueEvent(scrollY, "change", (value) => {
    const screenHeight = window.innerHeight
    const threshold = screenHeight * 0.1
    const fadeRange = screenHeight * 0.1

    if (value < threshold) {
      opacity.set(0)
      setIsAtTop(true)
    } else {
      opacity.set(Math.min((value - threshold) / fadeRange, 1))
      setIsAtTop(false)
    }
  })

  return (
    <div
      className="flex items-center gap-2 size-full justify-center"
      onClick={!isAtTop ? handleScrollToTop : undefined}
    >
      <svg className="absolute inset-0 size-full pointer-events-none">
        <m.rect
          x="0.5"
          y="0.5"
          style={{
            width: "calc(100% - 1px)",
            height: "calc(100% - 1px)",
            pathLength: scrollYProgress,
            opacity,
          }}
          rx="20"
          ry="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-theme-500"
        />
      </svg>
      <AnimatePresence mode="popLayout" initial={false}>
        {isAtTop
          ? (
              <m.div
                key="top"
                className="flex items-center gap-2"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <Logo className="text-theme-500 size-5" />
                <WordmarkLogo className="w-[4.6em] h-auto text-xl cursor-pointer transition-opacity" accentClassName="text-theme-500" />
              </m.div>
            )
          : (
              <m.div
                key="go-top"
                className="flex items-center gap-2"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <PhArrowFatUpDuotone className="text-theme-400 size-5" />
                <span className="text-xl font-bold whitespace-nowrap cursor-pointer transition-opacity">
                  Go to top
                </span>
              </m.div>
            )}
      </AnimatePresence>
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

      <DynamicIsland
        top={0}
        wrapperClassName="absolute top-[26px] inset-x-0"
        smallClassName="relative flex gap-2 items-center px-4 shrink-0 pointer-events-auto cursor-pointer island-pill"
        largeClassName="p-3 sunrise-theme-500 rounded-2xl pointer-events-auto"
        smallHeight={40}
        smallWidth={width}
        largeWidth={300}
        largeHeight={160}
      >
        {isSmall =>
          isSmall
            ? (
                <HeaderProgress scrollContainerRef={scrollContainerRef} />
              )
            : (
                <ThemeSelector />
              )}
      </DynamicIsland>
    </>
  )
}
