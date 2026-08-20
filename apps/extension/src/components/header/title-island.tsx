import type { ElementEventBasePayload } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import type { HeaderNotification } from "./notification"
import type { HeaderProgressState } from "./use-header-progress"
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine"
import { dropTargetForElements, monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { DynamicIsland } from "@newsnext/ui/components/dynamic-island"
import { Logo } from "@newsnext/ui/components/logo"
import { ThemeSelector } from "@newsnext/ui/components/theme-selector"
import {
  GoToTopWordmark,
  NewsNowWordmarkLogo,
  WordmarkLogo,
} from "@newsnext/ui/components/wordmark-logo"
import { useAtomValue, useSetAtom } from "jotai"
import { AnimatePresence, m, useReducedMotion } from "motion/react"
import { useEffect, useEffectEvent, useRef, useState } from "react"
import { getBoardColor, isSortableData } from "@/lib/board"
import { handleThemeSwitch } from "@/lib/utils/swith-theme"
import { boardsAtom, deleteInstanceAtom, updateBoardAtom } from "@/store/board"
import { currentBoardIdAtom } from "@/store/settings"
import { PhArrowFatUp, PhTrash } from "../icons/ph"
import { IslandNotification } from "./island-notification"
import {
  HEADER_NOTIFICATION_DURATION,
  HEADER_NOTIFICATION_HEIGHT,
  HEADER_NOTIFICATION_WIDTH,
} from "./notification"
import { useHeaderProgress } from "./use-header-progress"

function HeaderProgress({
  handleScrollToTop,
  isAtTop,
  isNextLayer,
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
                {isNextLayer
                  ? <WordmarkLogo className="h-auto w-[4.5em] shrink-0 text-xl transition-opacity" />
                  : <NewsNowWordmarkLogo className="h-auto w-[4.5em] shrink-0 text-xl transition-opacity" />}
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
                <GoToTopWordmark className="h-auto w-[4.5em] shrink-0 translate-y-[0.08em] text-xl transition-opacity" />
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
  width?: number
}

function CurrentBoardThemeControls() {
  const boards = useAtomValue(boardsAtom)
  const currentBoardId = useAtomValue(currentBoardIdAtom)
  const updateBoard = useSetAtom(updateBoardAtom)
  const board = boards.find(candidate => candidate.id === currentBoardId)

  if (!board) {
    return null
  }

  return (
    <section
      aria-label="Board color"
      className="flex size-full items-center p-3 text-foreground"
      onClick={event => event.stopPropagation()}
    >
      <div className="size-full">
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
    </section>
  )
}

function TrashDropTarget({ active }: { active: boolean }) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div
      className="flex size-full items-center justify-center gap-2.5 text-red-600 dark:text-red-400"
      aria-label={active ? "Release to delete LiveCard" : "Delete LiveCard"}
    >
      <m.div
        animate={active && !shouldReduceMotion
          ? { rotate: [-5, 5, 0], scale: 1.12 }
          : { rotate: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <PhTrash className="size-7" />
      </m.div>
      <span className="text-sm font-semibold">
        {active ? "Release to delete" : "Drop to delete"}
      </span>
    </div>
  )
}

export function TitleIsland({
  notification,
  onDismissNotification,
  width = 150,
}: TitleIslandProps) {
  const headerProgress = useHeaderProgress()
  const [themeExpanded, setThemeExpanded] = useState(false)
  const [isDraggingLiveCard, setIsDraggingLiveCard] = useState(false)
  const [isOverTrash, setIsOverTrash] = useState(false)
  const islandSurfaceRef = useRef<HTMLDivElement>(null)
  const deleteInstance = useSetAtom(deleteInstanceAtom)

  const deleteDraggedLiveCards = useEffectEvent(async ({ source }: ElementEventBasePayload) => {
    if (!isSortableData(source.data)) return

    try {
      for (const instanceId of source.data.ids) {
        await deleteInstance(instanceId)
      }
    } catch (error) {
      console.error("Failed to delete dropped LiveCards", error)
    }
  })

  useEffect(() => {
    const islandSurface = islandSurfaceRef.current
    if (!islandSurface) return

    return combine(
      monitorForElements({
        canMonitor: ({ source }) => isSortableData(source.data),
        onDragStart: () => setIsDraggingLiveCard(true),
        onDrop: () => {
          setIsDraggingLiveCard(false)
          setIsOverTrash(false)
        },
      }),
      dropTargetForElements({
        element: islandSurface,
        canDrop: ({ source }) => isSortableData(source.data),
        onDragEnter: () => setIsOverTrash(true),
        onDragLeave: () => setIsOverTrash(false),
        onDrop: (args) => {
          setIsOverTrash(false)
          void deleteDraggedLiveCards(args)
        },
      }),
    )
  }, [])

  useEffect(() => {
    if (!notification) return

    const timeout = window.setTimeout(onDismissNotification, HEADER_NOTIFICATION_DURATION)
    return () => window.clearTimeout(timeout)
  }, [notification, onDismissNotification])

  const expanded = isDraggingLiveCard || themeExpanded || notification !== null

  return (
    <>
      {/* Placeholder */}
      <div className="h-11 shrink-0" style={{ width: `${width}px` }} />

      <DynamicIsland
        top={26}
        expanded={expanded}
        blockOutsideInteraction={!isDraggingLiveCard && notification === null}
        wrapperClassName="absolute inset-x-0"
        surfaceRef={islandSurfaceRef}
        className={isDraggingLiveCard
          ? isOverTrash
            ? "bg-red-500/24! text-red-700! shadow-[inset_0_0_0_2px_color-mix(in_oklab,var(--color-red-500)_60%,transparent)] dark:text-red-300!"
            : "bg-red-500/14! text-red-700! dark:text-red-300!"
          : undefined}
        smallClassName="flex items-center gap-2 px-4"
        smallHeight={40}
        smallWidth={width}
        largeWidth={isDraggingLiveCard ? 190 : notification ? HEADER_NOTIFICATION_WIDTH : 270}
        largeHeight={isDraggingLiveCard ? 72 : notification ? HEADER_NOTIFICATION_HEIGHT : 110}
        onChange={(isSmall) => {
          if (isDraggingLiveCard) return
          if (!isSmall) {
            setThemeExpanded(true)
            return
          }

          if (notification) {
            onDismissNotification()
            return
          }

          setThemeExpanded(false)
        }}
        outerDecoration={isSmall => isSmall
          ? !isDraggingLiveCard && (
              <HeaderProgressGlow
                opacity={headerProgress.opacity}
                scrollYProgress={headerProgress.scrollYProgress}
              />
            )
          : null}
      >
        {(isSmall) => {
          if (isDraggingLiveCard) {
            return <TrashDropTarget active={isOverTrash} />
          }

          if (notification) {
            return <IslandNotification notification={notification} />
          }

          return isSmall
            ? <HeaderProgress {...headerProgress} />
            : <CurrentBoardThemeControls />
        }}
      </DynamicIsland>
    </>
  )
}
