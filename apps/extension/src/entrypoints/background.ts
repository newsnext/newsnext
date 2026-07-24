import { registerService } from "@webext-core/proxy-service"
import { browser, defineBackground } from "#imports"
import { installImageRequestRules } from "@/lib/background/image-request-rules"
import { registerRadarBadge } from "@/lib/background/radar-badge"
import { toggleRadarOverlay } from "@/lib/background/radar-overlay"
import { BACKGROUND_SERVICE_KEY, createBackgroundService } from "@/lib/background/service"

const backgroundService = createBackgroundService()
const DASHBOARD_MENU_ID = "dashboard"

function registerDashboardMenu(): void {
  browser.contextMenus.create({
    id: DASHBOARD_MENU_ID,
    title: "Dashboard",
    contexts: [import.meta.env.MANIFEST_VERSION === 3 ? "action" : "browser_action"],
  })
}

export default defineBackground(() => {
  registerService(BACKGROUND_SERVICE_KEY, backgroundService)
  registerRadarBadge()
  void installImageRequestRules()

  browser.runtime.onInstalled.addListener(registerDashboardMenu)

  browser.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === DASHBOARD_MENU_ID) {
      void browser.tabs.create({ url: browser.runtime.getURL("/dashboard.html") })
    }
  })

  browser.action.onClicked.addListener((tab) => {
    void toggleRadarOverlay(tab).catch(() => {
      // Scripts cannot be injected into browser-internal and extension pages.
    })
  })
})
