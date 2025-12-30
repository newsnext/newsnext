import type { QueryClient } from "@tanstack/react-query"
import type { PropsWithChildren } from "react"
import type { ThemeMode } from "@/lib/utils/swith-theme"
import { QueryClientProvider } from "@tanstack/react-query"
import { httpBatchStreamLink } from "@trpc/client"
import { useState } from "react"
import { BASE_URL } from "@/lib/env"
import { trpc } from "@/lib/trpc"
import {
  handleThemeModeSwitch,
  handleThemeSwitch,
  handleThemeVersionSwitch,
  THEME_COLOR_KEY,
  THEME_MODE_KEY,
  THEME_VERSION_KEY,
} from "@/lib/utils/swith-theme"

// Initialize theme as soon as possible to avoid flicker
if (typeof window !== "undefined") {
  const storedMode = localStorage.getItem(THEME_MODE_KEY)
  if (storedMode) handleThemeModeSwitch(storedMode as ThemeMode)
  const storedVersion = localStorage.getItem(THEME_VERSION_KEY)
  if (storedVersion) handleThemeVersionSwitch(storedVersion === "v4" ? "v4" : "v3")
  const theme = localStorage.getItem(THEME_COLOR_KEY)
  if (theme) handleThemeSwitch(theme)
}

interface AppProviderProps {
  queryClient: QueryClient
}

export function AppProvider({
  children,
  queryClient,
}: PropsWithChildren<AppProviderProps>) {
  const [trpcClient] = useState(
    () =>
      trpc.createClient({
        links: [
          httpBatchStreamLink({
            url: `${BASE_URL}/api/trpc`,
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
