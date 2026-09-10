import type { ReactNode } from "react"
import { cn } from "@newsnext/ui/lib/utils"
import "./flip-animate.css"

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
  duration = 600,
  children,
}: FlipAnimateProps): React.JSX.Element {
  const sideCSS = "flip-animate-face absolute inset-0 h-full w-full [backface-visibility:hidden]"

  return (
    <div
      className={cn(
        "flip-animate relative w-full h-full perspective-[1200px] [container-type:size]",
        className,
      )}
      data-axis={rotate}
      style={{ transitionDuration: `${duration}ms` }}
    >
      <div
        className={sideCSS}
        inert={flipped}
        aria-hidden={flipped}
        data-turned={flipped}
      >
        {children[0]}
      </div>
      <div
        className={sideCSS}
        inert={!flipped}
        aria-hidden={!flipped}
        data-turned={!flipped}
        data-reverse
      >
        {children[1]}
      </div>
    </div>
  )
}
