import type { SquircleFallback } from "@newsnext/ui/hooks/use-squircle"
import type * as React from "react"
import { useSquircle } from "@newsnext/ui/hooks/use-squircle"
import { cn } from "@newsnext/ui/lib/utils"

type SquircleRadius = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl"
type SquircleVariant = "default" | "modal-shell" | "modal-inner"

const squircleRadiusValues = {
  "sm": 4,
  "md": 6,
  "lg": 8,
  "xl": 12,
  "2xl": 16,
  "3xl": 24,
  "4xl": 32,
} satisfies Record<SquircleRadius, number>

interface SquircleBoxProps extends React.ComponentPropsWithRef<"div"> {
  fallback?: SquircleFallback
  radius?: SquircleRadius | number
  variant?: SquircleVariant
}

function resolveRadius(radius: SquircleBoxProps["radius"]) {
  if (typeof radius === "number") {
    return radius
  }

  return squircleRadiusValues[radius ?? "2xl"]
}

function SquircleBox({
  className,
  fallback,
  radius,
  variant = "default",
  style,
  ...props
}: SquircleBoxProps): React.JSX.Element {
  const resolvedRadius = resolveRadius(radius)
  const squircleStyle = useSquircle(resolvedRadius, { fallback })

  return (
    <div
      {...props}
      data-squircle
      className={cn(
        "overflow-hidden",
        variant === "modal-shell" && "relative isolate bg-background p-2.5 before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-theme-400/45 before:content-['']",
        variant === "modal-inner" && "bg-background/70 zenith-theme-400",
        className,
      )}
      style={{
        ...style,
        ...squircleStyle,
      }}
    />
  )
}

export { SquircleBox }
export type { SquircleRadius }
