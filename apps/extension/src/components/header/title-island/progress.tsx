import type { HeaderProgressState } from "../use-header-progress"
import { Logo } from "@newsnext/ui/components/logo"
import {
  GoToTopWordmark,
  NewsNowWordmarkLogo,
  WordmarkLogo,
} from "@newsnext/ui/components/wordmark-logo"
import { AnimatePresence, m } from "motion/react"
import { PhArrowFatUp } from "../../icons/ph"

export function TitleIslandProgress({
  handleScrollToTop,
  isAtTop,
  isNextLayer,
  opacity,
  scrollYProgress,
}: HeaderProgressState) {
  return (
    <div
      className="flex size-full items-center justify-center gap-2"
      onClick={!isAtTop ? handleScrollToTop : undefined}
    >
      <svg className="pointer-events-none absolute inset-0 size-full">
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
                <Logo className="size-5 text-primary" />
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
                <PhArrowFatUp className="size-5 text-theme-400" />
                <GoToTopWordmark className="h-auto w-[4.5em] shrink-0 translate-y-[0.08em] text-xl transition-opacity" />
              </m.div>
            )}
      </AnimatePresence>
    </div>
  )
}

export function TitleIslandProgressGlow({
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
