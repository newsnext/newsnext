import type { CSSProperties } from "react"
import { getCssShape } from "@newsnext/ui/lib/figma-squircle"
import { useMemo, useSyncExternalStore } from "react"

type SquircleRendering = "corner-shape" | "shape" | "round"
type SquircleFallback = "border-radius"

interface SquircleOptions {
  fallback?: SquircleFallback
  rendering?: SquircleRendering
}

interface SquircleStyle extends CSSProperties {
  cornerShape?: "squircle"
}

const subscribe = (): (() => void) => () => undefined

function getSquircleRendering(): SquircleRendering {
  if (typeof CSS === "undefined") return "round"
  if (CSS.supports("corner-shape", "squircle")) return "corner-shape"
  if (CSS.supports("clip-path", getCssShape(1))) return "shape"
  return "round"
}

function getServerSquircleRendering(): SquircleRendering {
  return "round"
}

function resolveSquircleStyle(
  radius: number,
  rendering: SquircleRendering,
): SquircleStyle {
  if (rendering === "corner-shape") {
    return {
      borderRadius: radius * 2,
      cornerShape: "squircle",
    }
  }

  if (rendering === "shape") {
    return {
      borderRadius: radius,
      clipPath: getCssShape(radius),
    }
  }

  return { borderRadius: radius }
}

function resolveSquircleRendering(
  rendering: SquircleRendering,
  fallback?: SquircleFallback,
): SquircleRendering {
  if (rendering === "shape" && fallback === "border-radius") return "round"
  return rendering
}

function useSquircle(
  radius: number,
  { fallback, rendering }: SquircleOptions = {},
): SquircleStyle {
  const detectedRendering = useSyncExternalStore(
    subscribe,
    getSquircleRendering,
    getServerSquircleRendering,
  )
  const resolvedRendering = resolveSquircleRendering(rendering ?? detectedRendering, fallback)
  return useMemo(
    () => resolveSquircleStyle(radius, resolvedRendering),
    [radius, resolvedRendering],
  )
}

export { resolveSquircleRendering, resolveSquircleStyle, useSquircle }
export type { SquircleFallback, SquircleOptions, SquircleRendering, SquircleStyle }
