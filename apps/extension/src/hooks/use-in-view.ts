import type { UseInViewOptions as MotionUseInViewOptions } from "motion/react"
import type { RefObject } from "react"
import { inView } from "motion"
import { useEffect, useRef, useState } from "react"

export interface UseInViewOptions extends Omit<MotionUseInViewOptions, "once"> {
  once?: boolean | number
}

export function useInView(
  ref: RefObject<Element | null>,
  {
    root,
    margin,
    amount,
    once = false,
    initial = false,
  }: UseInViewOptions = {},
): boolean {
  const [isInView, setIsInView] = useState(initial)
  const hasEnteredRef = useRef(initial)

  useEffect(() => {
    if (!ref.current || (once === true && hasEnteredRef.current)) {
      return
    }

    const onceDuration = typeof once === "number" && Number.isFinite(once)
      ? Math.max(0, once)
      : 0
    let exitTimer: number | undefined
    const clearExitTimer = () => window.clearTimeout(exitTimer)
    const onEnter = () => {
      clearExitTimer()
      hasEnteredRef.current = true
      setIsInView(true)

      if (once === true) {
        return
      }

      return () => {
        clearExitTimer()

        if (onceDuration === 0) {
          setIsInView(false)
          return
        }

        exitTimer = window.setTimeout(
          setIsInView,
          onceDuration,
          false,
        )
      }
    }

    const stop = inView(ref.current, onEnter, {
      root: root?.current ?? undefined,
      margin,
      amount,
    })

    return () => {
      clearExitTimer()
      stop()
    }
  }, [root, ref, margin, once, amount])

  return isInView
}
