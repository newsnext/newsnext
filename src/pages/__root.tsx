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
      <div className="h-screen w-screen flex-col-center justify-between sprinkle-theme-400">
        <header className="py-6 flex-col-center text-sm text-neutral-500 font-mono">
          Header
        </header>
        <main className="flex-1 text-theme-300 min-h-0 overflow-x-auto flex-col-center">
          <Outlet />
        </main>
        <footer className="py-6 flex-col-center text-sm text-neutral-500 font-mono">
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
