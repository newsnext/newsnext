import type { BoardLayer } from "@/lib/board"
import { useScrollProgressContext } from "@newsnext/ui/components/scroll-progress-context"
import { useLayoutEffect, useState } from "react"

interface BoardScrollRestorationOptions {
  boardId: string
  layer: BoardLayer
  viewKey: string
  contentReady: boolean
}

function readPosition(key: string): [number, number] {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(key) ?? "null")
    if (Array.isArray(value) && value.length === 2
      && typeof value[0] === "number" && Number.isFinite(value[0]) && value[0] >= 0
      && typeof value[1] === "number" && Number.isFinite(value[1]) && value[1] >= 0) {
      return [value[0], value[1]]
    }
  } catch {
    // Unavailable storage or malformed positions should not block the view.
  }
  return [0, 0]
}

export function useBoardScrollRestoration({
  boardId,
  layer,
  viewKey,
  contentReady,
}: BoardScrollRestorationOptions): boolean {
  const { rootScrollContainer } = useScrollProgressContext()
  const [readyViewKey, setReadyViewKey] = useState<string>()
  const storageKey = `newsnext:board-scroll:${JSON.stringify([boardId, layer])}`

  useLayoutEffect(() => {
    if (!contentReady || !rootScrollContainer) return

    let position = readPosition(storageKey)
    let settled = false
    rootScrollContainer.scrollTo({ behavior: "instant", left: position[0], top: position[1] })

    const capturePosition = () => {
      position = [rootScrollContainer.scrollLeft, rootScrollContainer.scrollTop]
    }
    const savePosition = () => {
      if (!settled) return
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(position))
      } catch {
        // Storage may be unavailable or full.
      }
    }
    const frameId = window.requestAnimationFrame(() => {
      settled = true
      capturePosition()
      rootScrollContainer.addEventListener("scroll", capturePosition, { passive: true })
      setReadyViewKey(viewKey)
    })
    window.addEventListener("pagehide", savePosition)

    return () => {
      window.cancelAnimationFrame(frameId)
      rootScrollContainer.removeEventListener("scroll", capturePosition)
      window.removeEventListener("pagehide", savePosition)
      // Commit the last observed position, before outgoing layout can clamp scroll.
      savePosition()
    }
  }, [contentReady, rootScrollContainer, storageKey, viewKey])

  return readyViewKey === viewKey
}
