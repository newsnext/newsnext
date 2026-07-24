import type { Browser } from "#imports"
import type { RadarContext } from "@/lib/radar"
import { useEffect, useRef, useState } from "react"
import { browser } from "#imports"

export function useCurrentTabRadarContext(): RadarContext | null {
  const [context, setContext] = useState<RadarContext | null>(null)
  const activeWindowIdRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    let isMounted = true

    async function updateFromActiveTab(): Promise<void> {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
      if (!isMounted) {
        return
      }

      activeWindowIdRef.current = tab?.windowId
      setContext(tab?.url
        ? {
            url: tab.url,
            title: tab.title,
          }
        : null)
    }

    const handleTabActivated = () => {
      void updateFromActiveTab()
    }

    const handleTabUpdated = (_tabId: number, changeInfo: Browser.tabs.OnUpdatedInfo, tab: Browser.tabs.Tab) => {
      if (!tab.active || (!changeInfo.url && !changeInfo.title)) {
        return
      }

      if (activeWindowIdRef.current !== undefined && tab.windowId !== activeWindowIdRef.current) {
        return
      }

      setContext(tab.url
        ? {
            url: tab.url,
            title: tab.title,
          }
        : null)
    }

    void updateFromActiveTab()
    browser.tabs.onActivated.addListener(handleTabActivated)
    browser.tabs.onUpdated.addListener(handleTabUpdated)

    return () => {
      isMounted = false
      browser.tabs.onActivated.removeListener(handleTabActivated)
      browser.tabs.onUpdated.removeListener(handleTabUpdated)
    }
  }, [])

  return context
}
