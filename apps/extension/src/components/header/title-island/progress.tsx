import type { Color } from "@newsnext/shared/types"
import type { TargetAndTransition } from "motion/react"
import type { HeaderProgressState } from "../use-header-progress"
import { ThemeIcon } from "@newsnext/ui/components/theme-icon"
import {
  GoToTopWordmark,
  NewsNowWordmarkLogo,
  WordmarkLogo,
} from "@newsnext/ui/components/wordmark-logo"
import { m } from "motion/react"
import { PhArrowFatUp } from "../../icons/ph"

const TITLE_TRANSITION = {
  duration: 0.32,
  ease: [0.4, 0, 0.2, 1] as const,
  times: [0, 0.5, 1],
}
// Animate transform directly so the browser can advance both labels while a Board renders.
const TITLE_ENTER: TargetAndTransition = {
  opacity: [null, 0, 1],
  transform: [null, "translateY(6px)", "translateY(0px)"],
}
const TITLE_EXIT: TargetAndTransition = {
  opacity: [null, 0, 0],
  transform: [null, "translateY(-6px)", "translateY(-6px)"],
}

export function TitleIslandProgress({
  handleScrollToTop,
  isAtTop,
  isNextLayer,
  opacity,
  scrollYProgress,
  themeColor,
}: HeaderProgressState & { themeColor: Color }) {
  return (
    <div
      className="relative flex size-full items-center justify-center gap-2"
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
      <m.div
        aria-hidden={!isAtTop}
        className="absolute flex items-center gap-2"
        initial={false}
        animate={isAtTop ? TITLE_ENTER : TITLE_EXIT}
        transition={TITLE_TRANSITION}
      >
        <ThemeIcon className="size-5" color={themeColor} />
        {isNextLayer
          ? <WordmarkLogo className="h-auto w-[4.5em] shrink-0 text-xl" />
          : <NewsNowWordmarkLogo className="h-auto w-[4.5em] shrink-0 text-xl" />}
      </m.div>
      <m.div
        aria-hidden={isAtTop}
        className="absolute flex items-center gap-2"
        initial={false}
        animate={isAtTop ? TITLE_EXIT : TITLE_ENTER}
        transition={TITLE_TRANSITION}
      >
        <PhArrowFatUp className="size-5 text-theme-400" />
        <GoToTopWordmark className="h-auto w-[4.5em] shrink-0 translate-y-[0.08em] text-xl" />
      </m.div>
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
