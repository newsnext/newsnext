import type { RefObject } from "react"
import { createContext, use } from "react"

export interface ScrollProgressContextValue {
  rootScrollContainerRef: RefObject<HTMLElement | null>
  nextLayerScrollContainerRef: RefObject<HTMLDivElement | null>
  isNextLayerActive: boolean
  setIsNextLayerActive: (active: boolean) => void
}

export type ScrollProgressActionsContextValue = Omit<
  ScrollProgressContextValue,
  "isNextLayerActive"
>

export const ScrollProgressContext = createContext<ScrollProgressContextValue | null>(null)
export const ScrollProgressActionsContext = createContext<ScrollProgressActionsContextValue | null>(null)

export function useScrollProgressContext(): ScrollProgressContextValue {
  const context = use(ScrollProgressContext)

  if (!context) {
    throw new Error("useScrollProgressContext must be used within ScrollProgressContext")
  }

  return context
}

export function useScrollProgressActionsContext(): ScrollProgressActionsContextValue {
  const context = use(ScrollProgressActionsContext)

  if (!context) {
    throw new Error("useScrollProgressActionsContext must be used within ScrollProgressActionsContext")
  }

  return context
}
