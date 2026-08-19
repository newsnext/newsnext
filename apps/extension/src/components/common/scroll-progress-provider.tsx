import type { PropsWithChildren, RefObject } from "react"
import { ScrollProgressContext } from "@newsnext/ui/components/scroll-progress-context"
import { useMemo } from "react"

interface ScrollProgressProviderProps {
  rootScrollContainerRef: RefObject<HTMLElement | null>
}

export function ScrollProgressProvider({
  children,
  rootScrollContainerRef,
}: PropsWithChildren<ScrollProgressProviderProps>) {
  const contextValue = useMemo(() => ({
    rootScrollContainerRef,
  }), [rootScrollContainerRef])

  return (
    <ScrollProgressContext value={contextValue}>
      {children}
    </ScrollProgressContext>
  )
}
