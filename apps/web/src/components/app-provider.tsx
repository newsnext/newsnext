import type { QueryClient } from "@tanstack/react-query"
import type { PropsWithChildren } from "react"
import type { ThemeMode } from "@/lib/utils/swith-theme"
import { isBrowser } from "@newsnext/ui/lib/is-browser"
import { QueryClientProvider } from "@tanstack/react-query"
import { httpBatchStreamLink } from "@trpc/client"
import { useSetAtom } from "jotai"
import { useEffect, useState } from "react"
import { authClient } from "@/lib/auth-client"
import { getAppURL } from "@/lib/env"
import { writeStoredSourceParamValues } from "@/lib/source-params"
import { trpc } from "@/lib/trpc"
import {
  handleThemeModeSwitch,
  handleThemeSwitch,
  handleThemeVersionSwitch,
  THEME_COLOR_KEY,
  THEME_MODE_KEY,
  THEME_VERSION_KEY,
} from "@/lib/utils/swith-theme"
import { sourceInstancesAtom, starredSourceInstanceIdsAtom } from "@/store/board"

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

function SourceStateHydrator() {
  const setSourceInstances = useSetAtom(sourceInstancesAtom)
  const setStarredSourceInstanceIds = useSetAtom(starredSourceInstanceIdsAtom)
  const { data: session } = authClient.useSession()
  const { data } = trpc.getSourceState.useQuery(undefined, {
    enabled: Boolean(session),
    retry: false,
  })

  useEffect(() => {
    if (!data) {
      return
    }

    setSourceInstances(data.sourceInstances)
    setStarredSourceInstanceIds(data.starredSourceInstanceIds)
    data.sourceInstances.forEach((instance) => {
      writeStoredSourceParamValues(instance.instanceId, instance.params)
    })
  }, [data, setSourceInstances, setStarredSourceInstanceIds])

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
            url: getAppURL("/api/trpc"),
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
        <SourceStateHydrator />
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  )
}
