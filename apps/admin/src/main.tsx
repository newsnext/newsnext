import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { httpBatchStreamLink } from "@trpc/client"
import ReactDOM from "react-dom/client"
import { App } from "./app"
import { getAPIURL } from "./auth"
import { trpc } from "./trpc"
import "./styles.css"

const queryClient = new QueryClient()
const trpcClient = trpc.createClient({
  links: [
    httpBatchStreamLink({
      url: getAPIURL("/api/trpc"),
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
