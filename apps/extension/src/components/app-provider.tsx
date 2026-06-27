import type { QueryClient } from "@tanstack/react-query"
import type { PropsWithChildren } from "react"
import type { ThemeMode } from "@/lib/utils/swith-theme"
import { isBrowser } from "@newsnext/ui/lib/is-browser"
import { QueryClientProvider, useQuery } from "@tanstack/react-query"
import { useSetAtom } from "jotai"
import { domMax, LazyMotion, MotionConfig } from "motion/react"
import { useEffect } from "react"
import { authClient } from "@/lib/auth-client"
import { orpc } from "@/lib/orpc"
import { writeStoredSourceParamValues } from "@/lib/source-params"
import {
  handleThemeModeSwitch,
  handleThemeSwitch,
  handleThemeVersionSwitch,
  THEME_COLOR_KEY,
  THEME_MODE_KEY,
  THEME_VERSION_KEY,
} from "@/lib/utils/swith-theme"
import { replaceInstancesAtom, replaceStarIdsAtom } from "@/store/board"

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
  const replaceInstances = useSetAtom(replaceInstancesAtom)
  const replaceStarIds = useSetAtom(replaceStarIdsAtom)
  const { data: session } = authClient.useSession()
  const { data } = useQuery(orpc.getSourceState.queryOptions({
    enabled: Boolean(session),
    retry: false,
  }))

  useEffect(() => {
    if (!data) {
      return
    }

    replaceInstances(data.sourceInstances)
    replaceStarIds(data.starredSourceInstanceIds)
    data.sourceInstances.forEach((instance) => {
      writeStoredSourceParamValues(instance.instanceId, instance.params)
    })
  }, [data, replaceInstances, replaceStarIds])

  return null
}

export function AppProvider({
  children,
  queryClient,
}: PropsWithChildren<AppProviderProps>) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domMax}>
        <QueryClientProvider client={queryClient}>
          <SourceStateHydrator />
          {children}
        </QueryClientProvider>
      </LazyMotion>
    </MotionConfig>
  )
}
