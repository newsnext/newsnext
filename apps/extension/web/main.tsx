import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { httpBatchStreamLink } from "@trpc/client"
import { useState } from "react"
import ReactDOM from "react-dom/client"
import { trpc } from "@/lib/trpc"
import { handleThemeSwitch, THEME_KEY } from "@/lib/utils/swith-theme"
import { routeTree } from "./routeTree.gen"
import "./globals.css"

// Initialize favicon on load
const theme = localStorage.getItem(THEME_KEY)
if (theme) {
  handleThemeSwitch(theme)
}

function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: Number.POSITIVE_INFINITY,
            refetchOnMount: false,
            refetchOnReconnect: false,
            refetchOnWindowFocus: false,
            retry: false,
          },
        },
      }),
  )
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchStreamLink({
          url: "/trpc",
        }),
      ],
    }),
  )

  const router = createRouter({
    routeTree,
    context: {
      queryClient,
    },
  })

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </trpc.Provider>
  )
}

const rootElement = document.getElementById("root")!

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(<App />)
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
