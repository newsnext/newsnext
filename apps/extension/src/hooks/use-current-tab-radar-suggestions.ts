import type { ResolvedRadarSuggestion } from "@/lib/radar"
import { useEffect, useState } from "react"
import { browser } from "#imports"
import { createBackgroundClient } from "@/lib/background"

export function useCurrentTabRadarSuggestions(): ResolvedRadarSuggestion[] | null {
  const [suggestions, setSuggestions] = useState<ResolvedRadarSuggestion[] | null>(null)

  useEffect(() => {
    let isCancelled = false

    async function readActiveTab(): Promise<void> {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
      if (!tab?.url || tab.id === undefined) {
        if (!isCancelled) setSuggestions(null)
        return
      }
      const nextSuggestions = await createBackgroundClient().radar.resolveSuggestions({
        tabId: tab.id,
        url: tab.url,
        title: tab.title,
      })

      if (!isCancelled) {
        setSuggestions(nextSuggestions)
      }
    }

    void readActiveTab()

    return () => {
      isCancelled = true
    }
  }, [])

  return suggestions
}
