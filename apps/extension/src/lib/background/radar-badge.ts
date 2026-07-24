import type { Browser } from "#imports"
import { browser } from "#imports"
import { createRadarMatcher } from "@/lib/radar"
import { getSourceDescriptors } from "@/lib/sources"

const radarMatcher = createRadarMatcher(getSourceDescriptors())

async function updateRadarBadge(tab: Browser.tabs.Tab): Promise<void> {
  if (tab.id === undefined) {
    return
  }

  const count = tab.url
    ? radarMatcher.getSuggestions({ url: tab.url, title: tab.title }).length
    : 0

  await browser.action.setBadgeText({
    tabId: tab.id,
    text: count > 0 ? String(count) : "",
  })

  if (count > 0) {
    await browser.action.setBadgeBackgroundColor({
      tabId: tab.id,
      color: "#ef4444",
    })
  }
}

export function registerRadarBadge(): void {
  const updateActiveRadarBadge = async (): Promise<void> => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true })
    await Promise.all(tabs.map(updateRadarBadge))
  }

  void updateActiveRadarBadge()

  browser.tabs.onActivated.addListener(() => {
    void updateActiveRadarBadge()
  })
  browser.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (!changeInfo.url && !changeInfo.title) {
      return
    }

    void updateRadarBadge(tab)
  })
}
