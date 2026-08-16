import type { RadarContext, RadarMatcher } from "@/lib/radar"
import { useEffect, useState } from "react"
import { browser } from "#imports"
import { readRadarPageSelections } from "@/lib/radar"

export function useCurrentTabRadarContext(radarMatcher: RadarMatcher): RadarContext | null {
  const [context, setContext] = useState<RadarContext | null>(null)

  useEffect(() => {
    let isCancelled = false

    async function readActiveTab(): Promise<void> {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
      if (!tab?.url) {
        if (!isCancelled) {
          setContext(null)
        }
        return
      }

      const nextContext: RadarContext = {
        url: tab.url,
        title: tab.title,
      }
      const pageQueries = radarMatcher.getPageQueries(nextContext)
      const pageSelections = tab.id === undefined
        ? {}
        : await readRadarPageSelections(tab.id, pageQueries)

      if (!isCancelled) {
        setContext({
          ...nextContext,
          pageSelections,
        })
      }
    }

    void readActiveTab()

    return () => {
      isCancelled = true
    }
  }, [radarMatcher])

  return context
}
