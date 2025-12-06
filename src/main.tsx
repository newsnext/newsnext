import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import ReactDOM from "react-dom/client"
import { routeTree } from "./routeTree.gen"
import "@/styles/globals.css"
import "unfonts.css"

const queryClient = new QueryClient()

const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
})

const rootElement = document.getElementById("root")!

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
