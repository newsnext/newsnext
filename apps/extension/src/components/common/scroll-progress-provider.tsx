import type { PropsWithChildren, RefObject } from "react"
import { ScrollProgressContext } from "@newsnext/ui/components/scroll-progress-context"
import { useMemo, useState } from "react"

interface ScrollProgressProviderProps {
  rootScrollContainerRef: RefObject<HTMLElement | null>
}

export function ScrollProgressProvider({
  children,
  rootScrollContainerRef,
}: PropsWithChildren<ScrollProgressProviderProps>) {
  const [nextLayerScrollContainer, setNextLayerScrollContainer] = useState<HTMLDivElement | null>(null)
  const contextValue = useMemo(() => ({
    nextLayerScrollContainer,
    rootScrollContainerRef,
    setNextLayerScrollContainer,
  }), [nextLayerScrollContainer, rootScrollContainerRef])

  return (
    <ScrollProgressContext value={contextValue}>
      {children}
    </ScrollProgressContext>
  )
}
