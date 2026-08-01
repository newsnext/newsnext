import { registerService } from "@webext-core/proxy-service"
import { browser, defineBackground } from "#imports"
import { registerRadarBadge } from "@/lib/background/radar-badge"
import { registerSourceRegistryLoader } from "@/lib/background/registry"
import { BACKGROUND_SERVICE_KEY, createBackgroundService } from "@/lib/background/service"
import { registerSourceConnectionWebSocket } from "@/lib/background/source-connection-websocket"
import { syncConfiguredSourceRequestRules } from "@/lib/background/source-request-rules"

registerSourceRegistryLoader()
const backgroundService = createBackgroundService()
const APP_MENU_ID = "app"

function registerAppMenu(): void {
  browser.contextMenus.create({
    id: APP_MENU_ID,
    title: "Open NewsNext",
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

  browser.runtime.onInstalled.addListener(registerAppMenu)

  browser.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === APP_MENU_ID) {
      void browser.tabs.create({ url: browser.runtime.getURL("/app.html") })
    }
  })
})
