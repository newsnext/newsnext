import type { QueryClient } from "@tanstack/react-query"
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router"
import { Suspense, useRef } from "react"
import { TanStackDevtools } from "@/components/common/devtools"
import { ScrollProgressProvider } from "@/components/common/scroll-progress-provider"
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
        </div>
      </div>
      <Suspense>
        <TanStackDevtools />
      </Suspense>
    </ScrollProgressProvider>
  )
}
