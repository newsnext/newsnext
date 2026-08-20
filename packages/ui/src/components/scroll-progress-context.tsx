import type { RefObject } from "react"
import { createContext, use } from "react"

export interface ScrollProgressContextValue {
  nextLayerScrollContainer: HTMLDivElement | null
  rootScrollContainerRef: RefObject<HTMLElement | null>
  setNextLayerScrollContainer: (container: HTMLDivElement | null) => void
}

export const ScrollProgressContext = createContext<ScrollProgressContextValue | null>(null)

export function useScrollProgressContext(): ScrollProgressContextValue {
  const context = use(ScrollProgressContext)

  if (!context) {
    throw new Error("useScrollProgressContext must be used within ScrollProgressContext")
  }

  return context
}
