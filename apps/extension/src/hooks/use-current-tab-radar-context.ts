import type { RadarContext, RadarMatcher } from "@/lib/radar"
import { useEffect, useState } from "react"
import { browser } from "#imports"
import { readRadarPageFeeds, readRadarPageSelections } from "@/lib/radar-page"

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
      const [pageSelections, feeds] = tab.id === undefined
        ? [{}, []]
        : await Promise.all([
            readRadarPageSelections(tab.id, pageQueries),
            radarMatcher.shouldDiscoverFeeds(nextContext)
              ? readRadarPageFeeds(tab.id)
              : Promise.resolve([]),
          ])

      if (!isCancelled) {
        setContext({
          ...nextContext,
          feeds,
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
