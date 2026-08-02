import type { CSSProperties } from "react"
import { getCssShape } from "@newsnext/ui/lib/figma-squircle"
import { useMemo, useSyncExternalStore } from "react"

type SquircleSupport = "corner-shape" | "shape" | "round"
type SquircleFallback = "border-radius"

interface SquircleStyle extends CSSProperties {
  cornerShape?: "squircle"
}

const subscribe = (): (() => void) => () => undefined

function getSquircleSupport(): SquircleSupport {
  if (typeof CSS === "undefined") return "round"
  if (CSS.supports("corner-shape", "squircle")) return "corner-shape"
  if (CSS.supports("clip-path", getCssShape(1))) return "shape"
  return "round"
}

function getServerSquircleSupport(): SquircleSupport {
  return "round"
}

function resolveSquircleStyle(
  radius: number,
  support: SquircleSupport,
): SquircleStyle {
  if (support === "corner-shape") {
    return {
      borderRadius: radius * 2,
      cornerShape: "squircle",
    }
  }

  if (support === "shape") {
    return {
      borderRadius: radius,
      clipPath: getCssShape(radius),
    }
  }

  return { borderRadius: radius }
}

function resolveSquircleSupport(
  support: SquircleSupport,
  fallback?: SquircleFallback,
): SquircleSupport {
  if (support === "shape" && fallback === "border-radius") return "round"
  return support
}

function useSquircle(
  radius: number,
  fallback?: SquircleFallback,
): SquircleStyle {
  const detectedSupport = useSyncExternalStore(
    subscribe,
    getSquircleSupport,
    getServerSquircleSupport,
  )
  const support = resolveSquircleSupport(detectedSupport, fallback)
  return useMemo(
    () => resolveSquircleStyle(radius, support),
    [radius, support],
  )
}

export { resolveSquircleStyle, resolveSquircleSupport, useSquircle }
export type { SquircleFallback, SquircleStyle }
