import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { httpBatchStreamLink } from "@trpc/client"
import ReactDOM from "react-dom/client"
import { App } from "./app"
import { API_BASE_URL } from "./auth"
import { trpc } from "./trpc"
import "./styles.css"

const queryClient = new QueryClient()
const trpcClient = trpc.createClient({
  links: [
    httpBatchStreamLink({
      url: `${API_BASE_URL}/api/trpc`,
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "include",
        })
      },
    }),
  ],
})

ReactDOM.createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>,
)
