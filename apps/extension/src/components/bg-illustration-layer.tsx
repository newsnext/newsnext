import type { CSSProperties } from "react"
import { useAtomValue } from "jotai"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useBgIllustration } from "@/hooks/use-bg-illustration"
import {
  loadBgIllustrationAspectRatio,
  normalizeBgIllustrationOpacity,
  normalizeBgIllustrationTransform,
  resolveBgIllustrationCenter,
  resolveBgIllustrationLayout,
  resolveBgIllustrationTranslation,
} from "@/lib/bg-illustration"
import { readSvgIllustrationAspectRatio } from "@/lib/bg-illustration/layout"
import { currentBoardAtom } from "@/store/board"

interface IllustrationAspectRatioState {
  illustration: string
  value: number
}

interface ViewportSize {
  height: number
  width: number
}

export function BgIllustrationLayer(): React.ReactPortal | null {
  const board = useAtomValue(currentBoardAtom)
  const configuration = board?.illustration
  const illustration = useBgIllustration(configuration?.id)
  const [viewport, setViewport] = useState<ViewportSize>(() => ({
    height: window.innerHeight,
    width: window.innerWidth,
  }))
  const [aspectRatioState, setAspectRatioState] = useState<IllustrationAspectRatioState | null>(null)
  const svgAspectRatio = illustration ? readSvgIllustrationAspectRatio(illustration) : null

  useEffect(() => {
    function updateViewport(): void {
      setViewport({ height: window.innerHeight, width: window.innerWidth })
    }

    window.addEventListener("resize", updateViewport)
    return () => window.removeEventListener("resize", updateViewport)
  }, [])

  useEffect(() => {
    if (!illustration || svgAspectRatio !== null) return

    let cancelled = false
    void loadBgIllustrationAspectRatio(illustration).then((value) => {
      if (!cancelled) setAspectRatioState({ illustration, value })
    }).catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [illustration, svgAspectRatio])

  if (!illustration || !configuration) return null

  const aspectRatio = svgAspectRatio
    ?? (aspectRatioState?.illustration === illustration ? aspectRatioState.value : null)
  if (aspectRatio === null) return null

  const normalizedTransform = normalizeBgIllustrationTransform(configuration.transform)
  const layout = resolveBgIllustrationLayout(viewport.width, viewport.height, aspectRatio)
  const center = resolveBgIllustrationCenter(layout, viewport.height, normalizedTransform)
  const translation = resolveBgIllustrationTranslation(
    layout,
    viewport.width,
    viewport.height,
    center.x,
    center.y,
  )
  const style: CSSProperties = {
    backgroundColor: `color-mix(in oklab, color-mix(in oklab, var(--foreground), var(--primary) 45%) ${normalizeBgIllustrationOpacity(configuration.opacity)}%, transparent)`,
    height: layout.height,
    left: layout.left,
    mask: `url("${illustration}") right bottom / 100% 100% no-repeat`,
    pointerEvents: "none",
    position: "fixed",
    top: layout.top,
    transform: `translate(${translation.x}px, ${translation.y}px) rotate(${normalizedTransform.rotation}deg) scale(${normalizedTransform.scale})`,
    transformOrigin: "center",
    WebkitMask: `url("${illustration}") right bottom / 100% 100% no-repeat`,
    width: layout.width,
    zIndex: 1,
  }

  return createPortal(<div aria-hidden style={style} />, document.body)
}
