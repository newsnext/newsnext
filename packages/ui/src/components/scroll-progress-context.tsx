import type { RefObject } from "react"
import { createContext, use } from "react"

export interface ScrollProgressContextValue {
  rootScrollContainer: HTMLElement | null
  rootScrollContainerRef: RefObject<HTMLElement | null>
}

export const ScrollProgressContext = createContext<ScrollProgressContextValue | null>(null)

export function useScrollProgressContext(): ScrollProgressContextValue {
  const context = use(ScrollProgressContext)

  if (!context) {
    throw new Error("useScrollProgressContext must be used within ScrollProgressContext")
  }

  return context
}
