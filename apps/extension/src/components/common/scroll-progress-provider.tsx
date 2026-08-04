import type { PropsWithChildren, RefObject } from "react"
import {
  ScrollProgressActionsContext,
  ScrollProgressContext,
} from "@newsnext/ui/components/scroll-progress-context"
import { useMemo, useState } from "react"

interface ScrollProgressProviderProps {
  nextLayerScrollContainerRef: RefObject<HTMLDivElement | null>
  rootScrollContainerRef: RefObject<HTMLElement | null>
}

export function ScrollProgressProvider({
  children,
  nextLayerScrollContainerRef,
  rootScrollContainerRef,
}: PropsWithChildren<ScrollProgressProviderProps>) {
  const [isNextLayerActive, setIsNextLayerActive] = useState(false)
  const actionsContextValue = useMemo(() => ({
    rootScrollContainerRef,
    nextLayerScrollContainerRef,
    setIsNextLayerActive,
  }), [nextLayerScrollContainerRef, rootScrollContainerRef])
  const scrollProgressContextValue = useMemo(() => ({
    ...actionsContextValue,
    isNextLayerActive,
  }), [actionsContextValue, isNextLayerActive])

  return (
    <ScrollProgressActionsContext value={actionsContextValue}>
      <ScrollProgressContext value={scrollProgressContextValue}>
        {children}
      </ScrollProgressContext>
    </ScrollProgressActionsContext>
  )
}
