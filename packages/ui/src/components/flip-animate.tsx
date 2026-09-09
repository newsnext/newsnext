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
  const reverseRotateCSS = rotate === "x" ? "[transform:rotateX(-180deg)]" : "[transform:rotateY(-180deg)]"
  const easeOutExpo = "cubic-bezier(0.16, 1, 0.3, 1)"

  const sideCSS = "absolute inset-0 h-full w-full transition-transform [backface-visibility:hidden]"

  return (
    <div
      className={cn(
        "relative w-full h-full perspective-[1000px]",
        className,
      )}
    >
      <div
        className={cn(sideCSS, flipped && "pointer-events-none scale-95", flipped && rotateCSS)}
        style={{
          transitionDuration: `${duration}ms`,
          transitionTimingFunction: easeOutExpo,
        }}
      >
        {children[0]}
      </div>
      <div
        className={cn(sideCSS, !flipped && "pointer-events-none scale-95", !flipped && reverseRotateCSS)}
        style={{
          transitionDuration: `${duration}ms`,
          transitionTimingFunction: easeOutExpo,
        }}
      >
        {children[1]}
      </div>
    </div>
  )
}
