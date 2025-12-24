import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { httpBatchStreamLink } from "@trpc/client"
import { useMemo } from "react"
import { trpc } from "@/lib/trpc"
import { handleThemeSwitch, THEME_KEY } from "@/lib/utils/swith-theme"

// Initialize theme as soon as possible to avoid flicker
if (typeof window !== "undefined") {
  const theme = localStorage.getItem(THEME_KEY)
  if (theme) {
    handleThemeSwitch(theme)
  }
}

export const createDefaultQueryClient = () =>
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
  })

interface AppProviderProps {
  children: ReactNode
  trpcUrl: string
  queryClient?: QueryClient
}

export function AppProvider({
  children,
  trpcUrl,
  queryClient: externalQueryClient,
}: AppProviderProps) {
  const queryClient = useMemo(
    () => externalQueryClient ?? createDefaultQueryClient(),
    [externalQueryClient],
  )

  const trpcClient = useMemo(
    () =>
      trpc.createClient({
        links: [
          httpBatchStreamLink({
            url: trpcUrl,
          }),
        ],
      }),
    [trpcUrl],
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}
