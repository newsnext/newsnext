import type { ResolvedRadarSuggestion } from "@/lib/radar"
import { useEffect, useState } from "react"
import { browser } from "#imports"
import { actions } from "@/lib/actions"
import { useBackgroundEvent } from "./use-background-event"

export function useCurrentTabRadarSuggestions(): ResolvedRadarSuggestion[] | null {
  const [suggestions, setSuggestions] = useState<ResolvedRadarSuggestion[] | null>(null)
  const [catalogRevision, setCatalogRevision] = useState(0)
  useBackgroundEvent("source.catalogChanged", () => setCatalogRevision(revision => revision + 1))

  useEffect(() => {
    let isCancelled = false

    async function readActiveTab(): Promise<void> {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
      if (!tab?.url || tab.id === undefined) {
        if (!isCancelled) setSuggestions(null)
        return
      }
      const nextSuggestions = await actions.radar.resolveSuggestions({
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
  }, [catalogRevision])

  return suggestions
}
