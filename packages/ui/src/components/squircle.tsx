import type { SquircleProps as BaseSquircleProps } from "@squircle-js/react"
import type * as React from "react"
import { cn } from "@newsnext/ui/lib/utils"

import { Squircle } from "@squircle-js/react"

type SquircleRadius = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "full"
type SquircleVariant = "default" | "modal-shell" | "modal-inner"

const squircleRadiusValues = {
  "sm": 4,
  "md": 6,
  "lg": 8,
  "xl": 12,
  "2xl": 16,
  "3xl": 24,
  "4xl": 32,
  "full": 9999,
} satisfies Record<SquircleRadius, number>

interface SquircleBoxProps
  extends Omit<BaseSquircleProps, "cornerRadius" | "cornerSmoothing">,
  Omit<React.ComponentPropsWithoutRef<"div">, keyof BaseSquircleProps> {
  radius?: SquircleRadius | number
  cornerRadius?: number
  cornerSmoothing?: number
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
  radius,
  cornerRadius,
  cornerSmoothing = 0.8,
  variant = "default",
  ...props
}: SquircleBoxProps) {
  return (
    <Squircle
      cornerRadius={cornerRadius ?? resolveRadius(radius)}
      cornerSmoothing={cornerSmoothing}
      data-variant={variant}
      className={cn(
        "overflow-hidden",
        variant === "modal-shell" && "bg-[color-mix(in_oklab,var(--popover)_60%,var(--color-theme-400)_40%)] p-2.5",
        variant === "modal-inner" && "bg-background/70 sunrise-theme-400",
        className,
      )}
      {...props}
    />
  )
}

export { SquircleBox, squircleRadiusValues }
export type { SquircleBoxProps, SquircleRadius, SquircleVariant }
