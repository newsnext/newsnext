import type { QueryClient } from "@tanstack/react-query"
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router"
import { Suspense, useRef } from "react"
import { TanStackDevtools } from "@/components/common/devtools"
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

  return (
    <>
      <div
        ref={scrollContainerRef}
        className="relative h-full w-full overflow-y-auto scrollbar-hidden"
      >
        <Header scrollContainerRef={scrollContainerRef} />
        <main className="px-2 sm:px-6 my-22">
          <Outlet />
        </main>
      </div>
      <Suspense>
        <TanStackDevtools />
      </Suspense>
    </>
  )
}
