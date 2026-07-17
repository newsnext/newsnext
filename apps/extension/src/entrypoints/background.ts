import { registerService } from "@webext-core/proxy-service"
import { browser } from "wxt/browser"
import { defineBackground } from "#imports"
import { installImageRequestRules } from "@/lib/background/image-request-rules"
import { BACKGROUND_SERVICE_KEY, createBackgroundService } from "@/lib/background/service"
import { getClientSourceDescriptors } from "@/lib/client-sources"
import { createRadarMatcher } from "@/lib/radar"

const backgroundService = createBackgroundService()
const radarMatcher = createRadarMatcher(getClientSourceDescriptors())
const DASHBOARD_MENU_ID = "dashboard"

function registerDashboardMenu(): void {
  browser.contextMenus.create({
    id: DASHBOARD_MENU_ID,
    title: "Dashboard",
    contexts: [import.meta.env.MANIFEST_VERSION === 3 ? "action" : "browser_action"],
  })
}

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
  void installImageRequestRules()

  void updateActiveRadarBadge()

  browser.runtime.onInstalled.addListener(registerDashboardMenu)

  browser.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === DASHBOARD_MENU_ID) {
      void browser.tabs.create({ url: browser.runtime.getURL("/dashboard.html") })
    }
  })

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
