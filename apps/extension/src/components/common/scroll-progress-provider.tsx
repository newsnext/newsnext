import type { PropsWithChildren, RefObject } from "react"
import { ScrollProgressContext } from "@newsnext/ui/components/scroll-progress-context"
import { useMemo } from "react"

interface ScrollProgressProviderProps {
  rootScrollContainer: HTMLElement | null
  rootScrollContainerRef: RefObject<HTMLElement | null>
}

export function ScrollProgressProvider({
  children,
  rootScrollContainer,
  rootScrollContainerRef,
}: PropsWithChildren<ScrollProgressProviderProps>) {
  const contextValue = useMemo(() => ({
    rootScrollContainer,
    rootScrollContainerRef,
  }), [rootScrollContainer, rootScrollContainerRef])

  return (
    <ScrollProgressContext value={contextValue}>
      {children}
    </ScrollProgressContext>
  )
}
