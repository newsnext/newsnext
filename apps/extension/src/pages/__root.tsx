import type { QueryClient } from "@tanstack/react-query"
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router"
import { Suspense, useMemo, useRef, useState } from "react"
import { TanStackDevtools } from "@/components/common/devtools"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { ScrollProgressContext } from "@/components/scroll-progress-context"

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
})

function NotFoundComponent() {
  return <div>Not Found</div>
}

function RootComponent() {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const nextLayerScrollContainerRef = useRef<HTMLDivElement>(null)
  const [isNextLayerActive, setIsNextLayerActive] = useState(false)
  const scrollProgressContextValue = useMemo(() => ({
    rootScrollContainerRef: scrollContainerRef,
    nextLayerScrollContainerRef,
    isNextLayerActive,
    setIsNextLayerActive,
  }), [isNextLayerActive])

  return (
    <ScrollProgressContext.Provider
      value={scrollProgressContextValue}
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
    </ScrollProgressContext.Provider>
  )
}
