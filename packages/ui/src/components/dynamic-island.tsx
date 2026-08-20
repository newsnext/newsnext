import type { SquircleFallback, SquircleRendering, SquircleStyle } from "@newsnext/ui/hooks/use-squircle"
import type { CSSProperties, ReactNode, Ref } from "react"
import { useClickAway } from "@newsnext/ui/hooks/use-click-away"
import { useSquircle } from "@newsnext/ui/hooks/use-squircle"
import { cn } from "@newsnext/ui/lib/utils"
import { AnimatePresence, m, useReducedMotion } from "motion/react"
import { useCallback, useEffect, useRef, useState } from "react"

const getVal = (val: number | string): string => {
  return typeof val === "number" ? `${val}px` : val
}

export interface DynamicIslandProps {
  className?: string
  top?: number | string
  expanded?: boolean
  blockOutsideInteraction?: boolean

  smallClassName?: string
  smallWidth?: number | string
  smallHeight?: number | string

  largeClassName?: string
  largeWidth?: number | string
  largeHeight?: number | string
  largeRadius?: number | string
  fallback?: SquircleFallback
  cornerRendering?: SquircleRendering

  wrapperClassName?: string
  surfaceRef?: Ref<HTMLDivElement>
  initialAnimation?: boolean

  onChange?: (isSmall: boolean) => void
  outerDecoration?: (isSmall: boolean) => ReactNode
  children?: (isSmall: boolean, helpers: { close: () => void }) => ReactNode
}

function DynamicIsland({
  className,
  top = 10,
  expanded,
  blockOutsideInteraction = true,

  smallClassName,
  smallWidth = 96,
  smallHeight = 30,

  largeClassName,
  largeWidth = 400,
  largeHeight = 180,
  largeRadius = 32,
  fallback,
  cornerRendering,

  wrapperClassName,
  surfaceRef,
  initialAnimation = false,

  onChange,
  outerDecoration,
  children,
}: DynamicIslandProps): React.JSX.Element {
  const [uncontrolledIsSmall, setUncontrolledIsSmall] = useState(true)
  const isControlled = expanded !== undefined
  const isSmall = isControlled ? !expanded : uncontrolledIsSmall
  const wrapperRef = useRef<HTMLDivElement>(null)
  const shouldReduceMotion = useReducedMotion()
  const canUseSquircle = typeof largeRadius === "number"
  const {
    borderRadius: squircleRadius,
    ...squircleTreatment
  } = useSquircle(
    canUseSquircle ? largeRadius : 0,
    { fallback, rendering: cornerRendering },
  )

  const onOpen = useCallback(() => {
    if (!isSmall) return
    navigator.vibrate?.(30)
    if (!isControlled) setUncontrolledIsSmall(false)
    onChange?.(false)
  }, [isControlled, isSmall, onChange])

  const onClose = useCallback(() => {
    if (isSmall) return
    if (!isControlled) setUncontrolledIsSmall(true)
    onChange?.(true)
  }, [isControlled, isSmall, onChange])

  const shapeTransition = shouldReduceMotion
    ? { duration: 0.15, ease: "easeOut" as const }
    : { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.82 }
  const collapsedRadius = typeof smallHeight === "number"
    ? smallHeight / 2
    : `calc(${smallHeight} / 2)`
  const expandedRadius = canUseSquircle
    ? squircleRadius
    : getVal(largeRadius)
  const activeSquircleStyle: SquircleStyle | undefined = !isSmall && canUseSquircle
    ? {
        clipPath: squircleTreatment.clipPath,
        cornerShape: squircleTreatment.cornerShape,
      }
    : undefined
  const shellStyle: SquircleStyle = {
    cornerShape: activeSquircleStyle?.cornerShape,
  }

  useEffect(() => {
    const onScroll = () => onClose()

    window.addEventListener("scroll", onScroll, true)
    return () => {
      window.removeEventListener("scroll", onScroll, true)
    }
  }, [onClose])

  useClickAway(
    () => {
      if (isSmall) return
      onClose()
    },
    wrapperRef,
    "pointerdown",
  )

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "pointer-events-none fixed inset-x-0 top-(--top) z-9999",
        wrapperClassName,
      )}
      style={
        {
          "--top": getVal(top),
        } as CSSProperties
      }
    >
      {!isSmall && blockOutsideInteraction && (
        <div className="pointer-events-auto fixed inset-0" onClick={onClose} />
      )}

      <div className="pointer-events-auto absolute left-1/2 top-0 -translate-x-1/2">
        <m.div
          role={isSmall ? "button" : undefined}
          tabIndex={isSmall ? 0 : undefined}
          aria-expanded={isSmall ? false : undefined}
          initial={initialAnimation && !shouldReduceMotion
            ? { opacity: 0, scale: 0.88 }
            : false}
          animate={{
            width: getVal(isSmall ? smallWidth : largeWidth),
            height: getVal(isSmall ? smallHeight : largeHeight),
            borderRadius: isSmall ? collapsedRadius : expandedRadius,
            boxShadow: isSmall
              ? "var(--dynamic-island-shadow-small)"
              : "var(--dynamic-island-shadow-large)",
            opacity: 1,
            scale: 1,
          }}
          transition={shapeTransition}
          style={shellStyle}
          whileHover={isSmall && !shouldReduceMotion ? { scale: 1.025 } : undefined}
          whileTap={isSmall && !shouldReduceMotion ? { scale: 0.975 } : undefined}
          className={cn(
            "dynamic-island-shell relative transform-gpu",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
          onClick={isSmall ? onOpen : onClose}
          onKeyDown={(event) => {
            if (!isSmall || (event.key !== "Enter" && event.key !== " ")) return
            event.preventDefault()
            onOpen()
          }}
        >
          {outerDecoration?.(isSmall)}
          <div
            ref={surfaceRef}
            data-state={isSmall ? "small" : "large"}
            style={activeSquircleStyle}
            className={cn(
              "dynamic-island-surface absolute inset-0 overflow-hidden rounded-[inherit] text-foreground",
              className,
              isSmall
                ? ["select-none", smallClassName]
                : largeClassName,
            )}
          >
            <AnimatePresence initial={false} mode="popLayout">
              <m.div
                key={isSmall ? "small" : "large"}
                initial={shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.92, filter: "blur(5px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.96, filter: "blur(3px)" }}
                transition={{ duration: shouldReduceMotion ? 0.1 : 0.18, ease: "easeOut" }}
                className="absolute inset-0 z-1"
              >
                {children?.(isSmall, { close: onClose })}
              </m.div>
            </AnimatePresence>
          </div>
        </m.div>
      </div>
    </div>
  )
}

export { DynamicIsland }
