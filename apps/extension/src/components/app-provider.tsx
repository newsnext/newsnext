import type { QueryClient } from "@tanstack/react-query"
import type { PropsWithChildren } from "react"
import { isBrowser } from "@newsnext/ui/lib/is-browser"
import { QueryClientProvider } from "@tanstack/react-query"
import { useAtomValue } from "jotai"
import { domMax, LazyMotion, MotionConfig } from "motion/react"
import { useEffect } from "react"
import { applyBackgroundArtwork } from "@/lib/background-artwork"
import {
  handleThemeModeSwitch,
  handleThemeSwitch,
  THEME_COLOR_KEY,
} from "@/lib/utils/swith-theme"
import { backgroundArtworkAtom, readCachedPersistedSettings } from "@/store/settings"

// Initialize theme as soon as possible to avoid flicker
if (isBrowser) {
  const settings = readCachedPersistedSettings()
  applyBackgroundArtwork(settings.appearance.backgroundArtwork)
  handleThemeModeSwitch(settings.appearance.themeMode)
  const theme = localStorage.getItem(THEME_COLOR_KEY) ?? "red"
  handleThemeSwitch(theme)
}

interface AppProviderProps {
  queryClient: QueryClient
}

export function AppProvider({
  children,
  queryClient,
}: PropsWithChildren<AppProviderProps>) {
  const backgroundArtwork = useAtomValue(backgroundArtworkAtom)

  useEffect(() => {
    applyBackgroundArtwork(backgroundArtwork)
  }, [backgroundArtwork])

  useEffect(() => {
    const preventContextMenuOutsideNewsItems = (event: MouseEvent) => {
      const target = event.target
      if (target instanceof Element && target.closest("[data-news-item]")) {
        return
      }

      event.preventDefault()
    }

    document.addEventListener("contextmenu", preventContextMenuOutsideNewsItems)
    return () => document.removeEventListener("contextmenu", preventContextMenuOutsideNewsItems)
  }, [])

  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domMax}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </LazyMotion>
    </MotionConfig>
  )
}
