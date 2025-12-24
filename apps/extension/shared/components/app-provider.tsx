import type { QueryClient } from "@tanstack/react-query"
import type { PropsWithChildren } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { httpBatchStreamLink } from "@trpc/client"
import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { handleThemeSwitch, THEME_KEY } from "@/lib/utils/swith-theme"

// Initialize theme as soon as possible to avoid flicker
if (typeof window !== "undefined") {
  const theme = localStorage.getItem(THEME_KEY)
  if (theme) {
    handleThemeSwitch(theme)
  }
}

interface AppProviderProps {
  trpcUrl: string
  queryClient: QueryClient
}

export function AppProvider({
  children,
  trpcUrl,
  queryClient,
}: PropsWithChildren<AppProviderProps>) {
  const [trpcClient] = useState(
    () =>
      trpc.createClient({
        links: [
          httpBatchStreamLink({
            url: trpcUrl,
          }),
        ],
      }),
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}
