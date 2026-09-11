import type { Ref, RefCallback } from "react"
import { useCallback } from "react"

const nativeOverlaySupport = new WeakMap<Document, boolean>()

function hasNativeOverlayScrollbars(document: Document): boolean {
  const cached = nativeOverlaySupport.get(document)
  if (cached !== undefined) return cached

  const probe = document.createElement("div")
  probe.style.cssText = "all:initial;position:fixed;top:-9999px;width:100px;height:100px;overflow:scroll;scrollbar-width:auto;visibility:hidden;pointer-events:none;contain:strict"
  document.body.append(probe)
  const supported = probe.offsetWidth === probe.clientWidth && probe.offsetHeight === probe.clientHeight
  probe.remove()
  nativeOverlaySupport.set(document, supported)
  return supported
}

export function overlayScrollbarsRef(element: HTMLElement | null): (() => void) | undefined {
  if (!element || hasNativeOverlayScrollbars(element.ownerDocument)) return

  let cancelled = false
  let destroy: (() => void) | undefined

  const initialize = async (): Promise<void> => {
    try {
      const { initOverlayScrollbars } = await import("../lib/overlay-scrollbars")
      if (!cancelled) destroy = initOverlayScrollbars(element)
    } catch (error) {
      if (!cancelled) console.warn("Unable to initialize overlay scrollbars; using native scrollbars.", error)
    }
  }

  void initialize()

  return () => {
    cancelled = true
    destroy?.()
  }
}

export function useOverlayScrollbars<T extends HTMLElement>(ref?: Ref<T>): RefCallback<T> {
  return useCallback((element: T | null) => {
    if (!element) return

    const cleanupRef = typeof ref === "function" ? ref(element) : undefined
    if (ref && typeof ref !== "function") ref.current = element
    const destroy = overlayScrollbarsRef(element)

    return () => {
      destroy?.()
      if (typeof cleanupRef === "function") cleanupRef()
      else if (typeof ref === "function") ref(null)
      else if (ref) ref.current = null
    }
  }, [ref])
}
