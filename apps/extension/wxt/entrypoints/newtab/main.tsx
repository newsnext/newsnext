import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import ReactDOM from "react-dom/client"
import { AppProvider, createDefaultQueryClient } from "@/components/app-provider"
import { routeTree } from "./routeTree"
import "./globals.css"

const queryClient = createDefaultQueryClient()
const hashHistory = createMemoryHistory()
const router = createRouter({
  routeTree,
  history: hashHistory,
  context: {
    queryClient,
  },
})

function App() {
  return (
    <AppProvider trpcUrl="http://localhost:4000/api/trpc" queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProvider>
  )
}

const rootElement = document.getElementById("root")!

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(<App />)
}
