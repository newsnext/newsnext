import { registerService } from "@webext-core/proxy-service"
import { browser } from "wxt/browser"
import { defineBackground } from "#imports"
import { BACKGROUND_SERVICE_KEY, createBackgroundService } from "@/lib/background/service"
import { getClientSourceDescriptors } from "@/lib/client-sources"
import { createRadarMatcher } from "@/lib/radar"

const backgroundService = createBackgroundService()
const radarMatcher = createRadarMatcher(getClientSourceDescriptors())

async function updateRadarBadge(tab: browser.tabs.Tab): Promise<void> {
  if (!tab.id) {
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

async function updateActiveRadarBadge(): Promise<void> {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true })
  await Promise.all(tabs.map(updateRadarBadge))
}

export default defineBackground(() => {
  registerService(BACKGROUND_SERVICE_KEY, backgroundService)

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
})
