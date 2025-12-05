import type { QueryClient } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/router-devtools"
import "@/styles/globals.css"

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
  return (
    <>
      <div className="flex-col-center justify-between">
        <header className="py-6 flex-center text-sm text-neutral-500 font-mono">
          Header
        </header>
        <main className="flex-1 min-h-0 w-full px-10">
          <Outlet />
        </main>
        <footer className="py-6 flex-center text-sm text-neutral-500 font-mono">
          Footer
        </footer>
      </div>
      {import.meta.env.DEV && (
        <>
          <ReactQueryDevtools buttonPosition="bottom-left" />
          <TanStackRouterDevtools position="bottom-right" />
        </>
      )}
    </>
  )
}
