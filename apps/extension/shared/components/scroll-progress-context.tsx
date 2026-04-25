import type { RefObject } from "react"
import { createContext, useContext } from "react"

export interface ScrollProgressContextValue {
  rootScrollContainerRef: RefObject<HTMLElement | null>
  dashboardScrollContainerRef: RefObject<HTMLDivElement | null>
  isDashboardActive: boolean
  setIsDashboardActive: (active: boolean) => void
}

export const ScrollProgressContext = createContext<ScrollProgressContextValue | null>(null)

export function useScrollProgressContext(): ScrollProgressContextValue {
  const context = useContext(ScrollProgressContext)

  if (!context) {
    throw new Error("useScrollProgressContext must be used within ScrollProgressContext")
  }

  return context
}
