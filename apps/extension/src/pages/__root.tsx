import type { QueryClient } from "@tanstack/react-query"
import type { PropsWithChildren, RefObject } from "react"
import {
  ScrollProgressActionsContext,
  ScrollProgressContext,
} from "@newsnext/ui/components/scroll-progress-context"
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router"
import { Suspense, useMemo, useRef, useState } from "react"
import { TanStackDevtools } from "@/components/common/devtools"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
})

function NotFoundComponent() {
  return <div>Not Found</div>
}

interface ScrollProgressProviderProps {
  nextLayerScrollContainerRef: RefObject<HTMLDivElement | null>
  rootScrollContainerRef: RefObject<HTMLDivElement | null>
}

function ScrollProgressProvider({
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

function RootComponent() {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const nextLayerScrollContainerRef = useRef<HTMLDivElement>(null)

  return (
    <ScrollProgressProvider
      rootScrollContainerRef={scrollContainerRef}
      nextLayerScrollContainerRef={nextLayerScrollContainerRef}
    >
      <div
        ref={scrollContainerRef}
        className="relative h-full min-h-0 w-full overflow-y-auto scrollbar-hidden"
      >
        <div className="flex min-h-full w-full flex-col">
          <Header scrollContainerRef={scrollContainerRef} />
          <main className="flex grow shrink-0 flex-col px-2 sm:px-6">
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>
      <Suspense>
        <TanStackDevtools />
      </Suspense>
    </ScrollProgressProvider>
  )
}
