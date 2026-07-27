import { registerService } from "@webext-core/proxy-service"
import { browser, defineBackground } from "#imports"
import { registerRadarBadge } from "@/lib/background/radar-badge"
import { toggleRadarOverlay } from "@/lib/background/radar-overlay"
import { registerSourceRegistryLoader } from "@/lib/background/registry"
import { BACKGROUND_SERVICE_KEY, createBackgroundService } from "@/lib/background/service"
import { registerSourceConnectionWebSocket } from "@/lib/background/source-connection-websocket"
import { syncConfiguredSourceRequestRules } from "@/lib/background/source-request-rules"

registerSourceRegistryLoader()
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
  void registerSourceConnectionWebSocket().catch((error) => {
    console.error("Failed to initialize the source connection", error)
  })
  void syncConfiguredSourceRequestRules().catch((error) => {
    console.error("Failed to synchronize source request rules", error)
  })

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
