import type { Browser } from "#imports"
import { loadSourceDescriptors } from "@newsnext/source/runtime"
import { browser } from "#imports"
import { createRadarMatcher, readRadarPageDiscovery } from "@/lib/radar"

async function updateRadarBadge(tab: Browser.tabs.Tab): Promise<void> {
  if (tab.id === undefined) {
    return
  }

  const sources = await loadSourceDescriptors()
  const matcher = createRadarMatcher(sources)
  const baseContext = tab.url ? { url: tab.url, title: tab.title } : undefined
  const discoveryOptions = baseContext
    ? matcher.getDiscoveryOptions(baseContext)
    : { feeds: false }
  const discovery = await readRadarPageDiscovery(tab.id, discoveryOptions)
  const count = baseContext
    ? matcher.getSuggestions({ ...baseContext, ...discovery }).length
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
    if (!changeInfo.url && !changeInfo.title && changeInfo.status !== "complete") {
      return
    }

    void updateRadarBadge(tab)
  })
}
