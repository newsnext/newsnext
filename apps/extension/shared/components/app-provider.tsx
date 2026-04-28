import type { QueryClient } from "@tanstack/react-query"
import type { PropsWithChildren } from "react"
import type { ThemeMode } from "@/lib/utils/swith-theme"
import { isBrowser } from "@newsnext/ui/lib/is-browser"
import { QueryClientProvider } from "@tanstack/react-query"
import { httpBatchStreamLink } from "@trpc/client"
import { useSetAtom } from "jotai"
import { useEffect, useState } from "react"
import { authClient } from "@/lib/auth-client"
import { BASE_URL } from "@/lib/env"
import { writeStoredFeedParamValues } from "@/lib/feed-params"
import { trpc } from "@/lib/trpc"
import {
  handleThemeModeSwitch,
  handleThemeSwitch,
  handleThemeVersionSwitch,
  THEME_COLOR_KEY,
  THEME_MODE_KEY,
  THEME_VERSION_KEY,
} from "@/lib/utils/swith-theme"
import { forkedFeedCardsAtom, starredFeedIdsAtom } from "@/store/board"

// Initialize theme as soon as possible to avoid flicker
if (isBrowser) {
  const storedMode = localStorage.getItem(THEME_MODE_KEY) ?? "system"
  handleThemeModeSwitch(storedMode as ThemeMode)
  const storedVersion = localStorage.getItem(THEME_VERSION_KEY) ?? "v3"
  handleThemeVersionSwitch(storedVersion === "v4" ? "v4" : "v3")
  const theme = localStorage.getItem(THEME_COLOR_KEY) ?? "red"
  handleThemeSwitch(theme)
}

interface AppProviderProps {
  queryClient: QueryClient
}

function FeedStateHydrator() {
  const setForkedFeedCards = useSetAtom(forkedFeedCardsAtom)
  const setStarredFeedIds = useSetAtom(starredFeedIdsAtom)
  const { data: session } = authClient.useSession()
  const { data } = trpc.getFeedState.useQuery(undefined, {
    enabled: Boolean(session),
    retry: false,
  })

  useEffect(() => {
    if (!data) {
      return
    }

    setForkedFeedCards(data.forks)
    setStarredFeedIds(data.starredFeedIds)
    data.paramConfigs.forEach((config) => {
      writeStoredFeedParamValues(config.feedInstanceId, config.params)
    })
  }, [data, setForkedFeedCards, setStarredFeedIds])

  return null
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
            fetch(url, options) {
              return fetch(url, {
                ...options,
                credentials: "include",
              })
            },
          }),
        ],
      }),
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <FeedStateHydrator />
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  )
}
