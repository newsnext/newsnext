import type { QueryClient } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/router-devtools"
import { useRef } from "react"
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
    <div
      ref={scrollContainerRef}
      className="relative h-full w-full overflow-y-auto scrollbar-hidden"
    >
      <Header scrollContainerRef={scrollContainerRef} />
      <main className="px-2 sm:px-6 my-18">
        <Outlet />
      </main>
      {import.meta.env.DEV && (
        <>
          <ReactQueryDevtools buttonPosition="bottom-left" />
          <TanStackRouterDevtools position="bottom-right" />
        </>
      )}
    </div>
  )
}
