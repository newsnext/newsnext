import { QueryClient } from "@tanstack/react-query"
import { createHashHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { AppProvider } from "@/components/app-provider"
import { renderPersistentReactRoot } from "@/lib/react-root"
import { routeTree } from "./routeTree"
import "@/styles/index.css"

const queryClient = new QueryClient()
const hashHistory = createHashHistory()
const router = createRouter({
  routeTree,
  history: hashHistory,
  context: {
    queryClient,
  },
})

function App() {
  return (
    <AppProvider queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProvider>
  )
}

const rootElement = document.getElementById("root")!
renderPersistentReactRoot(rootElement, <App />)
