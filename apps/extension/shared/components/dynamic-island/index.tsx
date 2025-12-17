import type { CSSProperties, ReactNode } from "react"
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
  triggerType = "click",
  initialAnimation = false,

  onChange,
  children,
}: DynamicIslandProps) {
  const [isHide, setIsHide] = useState(true)
  const hasMount = useRef(false)
  const [isSmall, setIsSmall] = useState(true)

  useEffect(() => {
    setIsHide(false)
    if (!isSmall) {
      hasMount.current = true
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

  const isClickType = triggerType === "click"

  useEffect(() => {
    if (isClickType) {
      const onScroll = () => onClose()

      window.addEventListener("scroll", onScroll, true)
      return () => {
        window.removeEventListener("scroll", onScroll, true)
      }
    }
  }, [isClickType])

  return (
    <div
      hidden={isHide}
      className={cn(
        "fixed inset-x-0 top-[--top] z-9999",
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
      {isClickType && (
        <div
          className={cn(
            !isSmall && "fixed inset-0",
          )}
          onClick={onClose}
        />
      )}

      <div
        className={cn(
          "absolute left-1/2 top-0 overflow-hidden bg-black text-white",
          "h-(--small-height) w-(--small-width) rounded-(--small-height)",
          "shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.15),0_1px_2px_rgb(0_0_0/0.2)]",
          "transform-[translate(-50%)_scale(var(--scale,1))]",
          "*:duration-200",
          className,
          isSmall
            ? [
                "cursor-pointer select-none duration-300 hover:[--scale:1.05]",
                (initialAnimation || hasMount.current) && "animate-[turn-to-small_0.4s_ease-out_both]",
                smallClassName,
              ]
            : [
                "animate-[turn-to-large_0.4s_ease-out_both]",
                largeClassName,
              ],
        )}
        {...(isClickType
          ? { onClick: isSmall ? onOpen : onClose }
          : { onMouseEnter: onOpen, onMouseLeave: onClose })}
      >
        {children?.(isSmall, { close: onClose })}
      </div>
    </div>
  )
}

export default DynamicIsland
