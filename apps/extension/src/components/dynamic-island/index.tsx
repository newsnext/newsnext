import type { CSSProperties, ReactNode } from "react"
import { useClickAway } from "@newsnext/ui/hooks/use-click-away"
import { cn } from "@newsnext/ui/lib/utils"
import { useCallback, useEffect, useRef, useState } from "react"
import "./index.css"

const getVal = (val: number | string) => {
  return typeof val === "number" ? `${val}px` : val
}

export interface DynamicIslandProps {
  className?: string
  top?: number | string

  smallClassName?: string
  smallWidth?: number | string
  smallHeight?: number | string

  largeClassName?: string
  largeWidth?: number | string
  largeHeight?: number | string
  largeRadius?: number | string

  wrapperClassName?: string
  triggerType?: "click" | "hover"
  initialAnimation?: boolean

  onChange?: (isSmall: boolean) => void
  children?: (isSmall: boolean, helpers: { close: () => void }) => ReactNode
}

function DynamicIsland({
  className,
  top = 10,

  smallClassName,
  smallWidth = 96,
  smallHeight = 30,

  largeClassName,
  largeWidth = 400,
  largeHeight = 180,
  largeRadius = 36,

  wrapperClassName,
  initialAnimation = false,

  onChange,
  children,
}: DynamicIslandProps) {
  const hasMountedRef = useRef(false)
  const [isSmall, setIsSmall] = useState(true)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isSmall) {
      hasMountedRef.current = true
    }
  }, [isSmall])

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const onOpen = useCallback(() => {
    navigator.vibrate?.(200)
    setIsSmall(false)
    onChangeRef.current?.(true)
  }, [])

  const onClose = useCallback(() => {
    setIsSmall(true)
    onChangeRef.current?.(false)
  }, [])

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
        "pointer-events-none fixed inset-x-0 top-[--top] z-9999 dark",
        wrapperClassName,
      )}
      style={
        {
          "--top": getVal(top),
          "--small-width": getVal(smallWidth),
          "--small-height": getVal(smallHeight),
          "--large-width": getVal(largeWidth),
          "--large-height": getVal(largeHeight),
          "--large-radius": getVal(largeRadius),
        } as CSSProperties
      }
    >
      <div
        className={cn(
          !isSmall && "pointer-events-auto fixed inset-0",
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          "pointer-events-auto absolute left-1/2 top-0 overflow-hidden bg-background text-white",
          "h-(--small-height) w-(--small-width) rounded-(--small-height)",
          "transform-[translate(-50%)_scale(var(--scale,1))]",
          "*:duration-200",
          className,
          isSmall
            ? [
                "cursor-pointer select-none duration-300 hover:[--scale:1.05]",
                (initialAnimation || hasMountedRef.current) && "animate-[turn-to-small_0.4s_ease-out_both]",
                smallClassName,
              ]
            : [
                "animate-[turn-to-large_0.4s_ease-out_both]",
                largeClassName,
              ],
        )}
        onClick={isSmall ? onOpen : onClose}
      >
        {children?.(isSmall, { close: onClose })}
      </div>
    </div>
  )
}

export default DynamicIsland
