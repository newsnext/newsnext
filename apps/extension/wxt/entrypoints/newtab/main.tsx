import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import ReactDOM from "react-dom/client"
import { Desk } from "@/components/desk"
import "./globals.css"

export const queryClient = new QueryClient()
const rootElement = document.getElementById("root")!

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <QueryClientProvider client={queryClient}>
      <Desk />
    </QueryClientProvider>,
  )
}
