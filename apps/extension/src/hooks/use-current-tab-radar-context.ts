import type { Browser } from "#imports"
import type { RadarContext, RadarMatcher } from "@/lib/radar"
import { useEffect, useRef, useState } from "react"
import { browser } from "#imports"
import { readRadarPageSelections } from "@/lib/radar-page"

export function useCurrentTabRadarContext(radarMatcher: RadarMatcher): RadarContext | null {
  const [context, setContext] = useState<RadarContext | null>(null)
  const activeWindowIdRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    let isMounted = true
    let updateVersion = 0

    async function updateFromActiveTab(): Promise<void> {
      const version = ++updateVersion
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
      if (!isMounted || version !== updateVersion) {
        return
      }

      activeWindowIdRef.current = tab?.windowId
      await updateFromTab(tab, version)
    }

    async function updateFromTab(
      tab: Browser.tabs.Tab | undefined,
      version: number,
    ): Promise<void> {
      if (!tab?.url) {
        if (isMounted && version === updateVersion) {
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

      if (isMounted && version === updateVersion) {
        setContext({
          ...nextContext,
          pageSelections,
        })
      }
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

      void updateFromTab(tab, ++updateVersion)
    }

    void updateFromActiveTab()
    browser.tabs.onActivated.addListener(handleTabActivated)
    browser.tabs.onUpdated.addListener(handleTabUpdated)

    return () => {
      isMounted = false
      browser.tabs.onActivated.removeListener(handleTabActivated)
      browser.tabs.onUpdated.removeListener(handleTabUpdated)
    }
  }, [radarMatcher])

  return context
}
