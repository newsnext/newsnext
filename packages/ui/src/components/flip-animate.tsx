import type { ReactNode } from "react"
import { cn } from "@newsnext/ui/lib/utils"

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
}: FlipAnimateProps): React.JSX.Element {
  const rotateCSS = rotate === "x" ? "[transform:rotateX(180deg)]" : "[transform:rotateY(180deg)]"
  const easeOutExpo = "cubic-bezier(0.16, 1, 0.3, 1)"

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
          transitionTimingFunction: easeOutExpo,
        }}
      >
        <div
          className={cn(sideCSS, flipped && "pointer-events-none scale-95")}
          style={{
            transitionDuration: `${duration * 0.6}ms`,
            transitionTimingFunction: flipped ? "ease-in" : easeOutExpo,
            transitionDelay: flipped ? "0ms" : `${duration * 0.3}ms`,
          }}
        >
          {children?.[0]}
        </div>
        <div
          className={cn(sideCSS, !flipped && "pointer-events-none scale-95", rotateCSS)}
          style={{
            transitionDuration: `${duration * 0.6}ms`,
            transitionTimingFunction: !flipped ? "ease-in" : easeOutExpo,
            transitionDelay: !flipped ? "0ms" : `${duration * 0.3}ms`,
          }}
        >
          {children?.[1]}
        </div>
      </div>
    </div>
  )
}
