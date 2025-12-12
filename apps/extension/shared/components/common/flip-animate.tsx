import type { ReactNode } from "react"
import { useMemo } from "react"
import { cn } from "@/lib/utils"

export interface FlipAnimateProps {
  rotate: "x" | "y"
  flipped: boolean
  className?: string
  duration?: number
  children: ReactNode[]
}

export function FlipAnimate({
  rotate,
  flipped,
  className,
  duration = 700,
  children,
}: FlipAnimateProps) {
  const rotateCSS = useMemo(
    () => rotate === "x" ? "[transform:rotateX(180deg)]" : "[transform:rotateY(180deg)]",
    [rotate],
  )

  const sideCSS = "absolute inset-0 [backface-visibility:hidden] w-full h-full transition-all"

  return (
    <div
      className={cn(
        "relative w-full h-full perspective-[1000px]",
        className,
      )}
    >
      <div
        className={cn(
          "relative w-full h-full transition-all transform-3d will-change-transform",
          flipped && rotateCSS,
        )}
        style={{
          transitionDuration: `${duration}ms`,
          transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <div
          className={cn(sideCSS, flipped && "pointer-events-none scale-95")}
          style={{
            transitionDuration: `${duration * 0.6}ms`,
            transitionTimingFunction: flipped ? "ease-in" : "cubic-bezier(0.34, 1.56, 0.64, 1)",
            transitionDelay: flipped ? "0ms" : `${duration * 0.3}ms`,
          }}
        >
          {children?.[0]}
        </div>
        <div
          className={cn(sideCSS, !flipped && "pointer-events-none scale-95", rotateCSS)}
          style={{
            transitionDuration: `${duration * 0.6}ms`,
            transitionTimingFunction: !flipped ? "ease-in" : "cubic-bezier(0.34, 1.56, 0.64, 1)",
            transitionDelay: !flipped ? "0ms" : `${duration * 0.3}ms`,
          }}
        >
          {children?.[1]}
        </div>
      </div>
    </div>
  )
}
