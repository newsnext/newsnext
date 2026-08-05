import type { QueryClient } from "@tanstack/react-query"
import type { PropsWithChildren } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { domMax, LazyMotion, MotionConfig } from "motion/react"
import { useEffect } from "react"

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
