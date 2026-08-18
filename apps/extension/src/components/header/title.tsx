import type { MotionValue } from "motion/react"
import type { RefObject } from "react"
import type { HeaderNotification } from "./notification"
import { DynamicIsland } from "@newsnext/ui/components/dynamic-island"
import { Logo } from "@newsnext/ui/components/logo"
import { useScrollProgressContext } from "@newsnext/ui/components/scroll-progress-context"
import { ThemeSelector } from "@newsnext/ui/components/theme-selector"
import { WordmarkLogo } from "@newsnext/ui/components/wordmark-logo"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { AnimatePresence, m, useMotionValue, useMotionValueEvent, useScroll } from "motion/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { getBoardColor } from "@/lib/board"
import { handleThemeModeSwitch, handleThemeSwitch } from "@/lib/utils/swith-theme"
import { boardsAtom, updateBoardAtom } from "@/store/board"
import { currentBoardIdAtom, themeModeAtom } from "@/store/settings"
import { PhArrowFatUp } from "../icons/ph"
import { ThemeModeSelector } from "../theme-mode-selector"
import { IslandNotification } from "./island-notification"
import {
  HEADER_NOTIFICATION_DURATION,
  HEADER_NOTIFICATION_HEIGHT,
  HEADER_NOTIFICATION_WIDTH,
} from "./notification"

interface HeaderProgressState {
  handleScrollToTop: (event: React.MouseEvent) => void
  isAtTop: boolean
  opacity: MotionValue<number>
  scrollYProgress: MotionValue<number>
}

function useHeaderProgress(scrollContainerRef?: RefObject<HTMLElement | null>): HeaderProgressState {
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
  const isAtTopRef = useRef(true)
  const opacity = useMotionValue(0)

  const handleScrollToTop = useCallback((event: React.MouseEvent) => {
    event.stopPropagation()
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

    const nextIsAtTop = value < threshold
    if (nextIsAtTop !== isAtTopRef.current) {
      isAtTopRef.current = nextIsAtTop
      setIsAtTop(nextIsAtTop)
    }

    if (nextIsAtTop) {
      opacity.set(0)
    } else {
      opacity.set(Math.min((value - threshold) / fadeRange, 1))
    }
  })

  return { handleScrollToTop, isAtTop, opacity, scrollYProgress }
}

function HeaderProgress({
  handleScrollToTop,
  isAtTop,
  opacity,
  scrollYProgress,
}: HeaderProgressState) {
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
          className="text-theme-400"
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
                <Logo className="text-primary size-5" />
                <WordmarkLogo className="w-[4.6em] h-auto text-xl transition-opacity" />
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
                <PhArrowFatUp className="text-theme-400 size-5" />
                <span className="text-xl font-bold whitespace-nowrap transition-opacity">
                  Go to top
                </span>
              </m.div>
            )}
      </AnimatePresence>
    </div>
  )
}

function HeaderProgressGlow({
  opacity,
  scrollYProgress,
}: Pick<HeaderProgressState, "opacity" | "scrollYProgress">) {
  return (
    <svg className="pointer-events-none absolute inset-0 size-full overflow-visible" aria-hidden="true">
      <m.rect
        x="0.5"
        y="0.5"
        style={{
          width: "calc(100% - 1px)",
          height: "calc(100% - 1px)",
          pathLength: scrollYProgress,
          opacity,
          filter: "blur(4px)",
        }}
        rx="20"
        ry="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-theme-400"
      />
    </svg>
  )
}

interface TitleIslandProps {
  notification: HeaderNotification | null
  onDismissNotification: () => void
  scrollContainerRef?: RefObject<HTMLElement | null>
  width?: number
}

function CurrentBoardAppearanceControls() {
  const boards = useAtomValue(boardsAtom)
  const currentBoardId = useAtomValue(currentBoardIdAtom)
  const updateBoard = useSetAtom(updateBoardAtom)
  const [themeMode, setThemeMode] = useAtom(themeModeAtom)
  const board = boards.find(candidate => candidate.id === currentBoardId)

  if (!board) {
    return null
  }

  const handleThemeModeChange = (nextMode: typeof themeMode): void => {
    setThemeMode(nextMode)
    handleThemeModeSwitch(nextMode)
  }

  return (
    <section
      aria-label="Appearance controls"
      className="grid size-full content-center gap-4 text-foreground"
      onClick={event => event.stopPropagation()}
    >
      <div className="h-20 w-full">
        <ThemeSelector
          value={getBoardColor(board)}
          onValueChange={(color) => {
            const previousColor = getBoardColor(board)
            handleThemeSwitch(color)
            void updateBoard({ ...board, color }).catch((error) => {
              handleThemeSwitch(previousColor)
              console.error("Failed to update Board color", error)
            })
          }}
        />
      </div>
      <ThemeModeSelector
        className="mx-auto dark:bg-white/10 dark:shadow-inner dark:shadow-white/5 dark:ring-1 dark:ring-white/10 dark:hover:bg-white/15"
        size="sm"
        value={themeMode}
        onValueChange={handleThemeModeChange}
      />
    </section>
  )
}

export function TitleIsland({
  notification,
  onDismissNotification,
  scrollContainerRef,
  width = 150,
}: TitleIslandProps) {
  const headerProgress = useHeaderProgress(scrollContainerRef)
  const [appearanceExpanded, setAppearanceExpanded] = useState(false)

  useEffect(() => {
    if (!notification) return

    const timeout = window.setTimeout(onDismissNotification, HEADER_NOTIFICATION_DURATION)
    return () => window.clearTimeout(timeout)
  }, [notification, onDismissNotification])

  const expanded = appearanceExpanded || notification !== null

  return (
    <>
      {/* Placeholder */}
      <div className="h-11 shrink-0" style={{ width: `${width}px` }} />

      <DynamicIsland
        top={26}
        expanded={expanded}
        blockOutsideInteraction={notification === null}
        wrapperClassName="absolute inset-x-0"
        smallClassName="flex items-center gap-2 px-4"
        largeClassName={notification ? undefined : "p-3"}
        smallHeight={40}
        smallWidth={width}
        largeWidth={notification ? HEADER_NOTIFICATION_WIDTH : 280}
        largeHeight={notification ? HEADER_NOTIFICATION_HEIGHT : 160}
        onChange={(isSmall) => {
          if (!isSmall) {
            setAppearanceExpanded(true)
            return
          }

          if (notification) {
            onDismissNotification()
            return
          }

          setAppearanceExpanded(false)
        }}
        outerDecoration={isSmall => isSmall
          ? (
              <HeaderProgressGlow
                opacity={headerProgress.opacity}
                scrollYProgress={headerProgress.scrollYProgress}
              />
            )
          : null}
      >
        {(isSmall) => {
          if (notification) {
            return <IslandNotification notification={notification} />
          }

          return isSmall
            ? <HeaderProgress {...headerProgress} />
            : <CurrentBoardAppearanceControls />
        }}
      </DynamicIsland>
    </>
  )
}
