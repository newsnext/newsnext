import type { QueryClient } from "@tanstack/react-query"
import type { PropsWithChildren } from "react"
import type { ThemeMode } from "@/lib/utils/swith-theme"
import { isBrowser } from "@newsnext/ui/lib/is-browser"
import { QueryClientProvider } from "@tanstack/react-query"
import { domMax, LazyMotion, MotionConfig } from "motion/react"
import { useEffect } from "react"
import {
  handleThemeModeSwitch,
  handleThemeSwitch,
  handleThemeVersionSwitch,
  THEME_COLOR_KEY,
  THEME_MODE_KEY,
  THEME_VERSION_KEY,
} from "@/lib/utils/swith-theme"

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

export function AppProvider({
  children,
  queryClient,
}: PropsWithChildren<AppProviderProps>) {
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
