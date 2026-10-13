import type { Browser } from "#imports"
import { browser } from "#imports"
import { loadRadarRuntime } from "./radar-runtime"

async function updateRadarBadge(tab: Browser.tabs.Tab): Promise<void> {
  if (tab.id === undefined) {
    return
  }

  const { matcher } = await loadRadarRuntime()
  const baseContext = tab.url ? { url: tab.url, title: tab.title } : undefined
  const count = baseContext
    ? matcher.getSuggestions(baseContext).length
    : 0

  await browser.action.setBadgeText({
    tabId: tab.id,
    text: count > 0 ? String(count) : "",
  })

  if (count > 0) {
    await browser.action.setBadgeTextColor({
      tabId: tab.id,
      color: "#fff1da",
    })
    await browser.action.setBadgeBackgroundColor({
      tabId: tab.id,
      color: "#ef4444",
    })
  }
}

export async function refreshActiveRadarBadge(): Promise<void> {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true })
  await Promise.all(tabs.map(updateRadarBadge))
}

export function registerRadarBadge(): void {
  void refreshActiveRadarBadge()

  browser.tabs.onActivated.addListener(() => {
    void refreshActiveRadarBadge()
  })
  browser.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (!changeInfo.url && !changeInfo.title && changeInfo.status !== "complete") {
      return
    }

    void updateRadarBadge(tab)
  })
}
