import type { RadarContext, RadarMatcher } from "@/lib/radar"
import { useEffect, useState } from "react"
import { browser } from "#imports"
import { readRadarPageDiscovery, readRadarPageSelections } from "@/lib/radar-page"

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
      const discoveryOptions = radarMatcher.getDiscoveryOptions(nextContext)
      const [pageSelections, discovery] = tab.id === undefined
        ? [{}, { feeds: [] }]
        : await Promise.all([
            readRadarPageSelections(tab.id, pageQueries),
            readRadarPageDiscovery(tab.id, discoveryOptions),
          ])

      if (!isCancelled) {
        setContext({
          ...nextContext,
          ...discovery,
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
