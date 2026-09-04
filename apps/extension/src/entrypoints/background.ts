import { registerService } from "@webext-core/proxy-service"
import { browser, defineBackground } from "#imports"
import { openAppTab } from "@/lib/app-tab"
import {
  backgroundActionDependencies,
  registerNativeIntegration,
} from "@/lib/background/native-integration"
import { registerRadarBadge } from "@/lib/background/radar-badge"
import { registerSourceRegistryLoader } from "@/lib/background/registry"
import { BACKGROUND_SERVICE_KEY, createBackgroundService } from "@/lib/background/service"
import { syncConfiguredSourceRequestRules } from "@/lib/background/source-request-rules"

registerSourceRegistryLoader()
const backgroundService = createBackgroundService(backgroundActionDependencies)
const APP_MENU_ID = "app"
const COSMOS_MENU_ID = "cosmos"
const ACTION_CONTEXT = import.meta.env.MANIFEST_VERSION === 3 ? "action" : "browser_action"

function registerActionMenus(): void {
  browser.contextMenus.create({
    id: APP_MENU_ID,
    title: "Open NewsNext",
    contexts: [ACTION_CONTEXT],
  })

  if (import.meta.env.DEV) {
    browser.contextMenus.create({
      id: COSMOS_MENU_ID,
      title: "Open Cosmos",
      contexts: [ACTION_CONTEXT],
    })
  }
}

export default defineBackground(() => {
  registerService(BACKGROUND_SERVICE_KEY, backgroundService)
  registerRadarBadge()
  void registerNativeIntegration().catch((error) => {
    console.error("Failed to initialize the App integration", error)
  })
  void syncConfiguredSourceRequestRules().catch((error) => {
    console.error("Failed to synchronize source request rules", error)
  })

  browser.runtime.onInstalled.addListener(registerActionMenus)

  browser.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === APP_MENU_ID) {
      void openAppTab()
    }

    if (import.meta.env.DEV && info.menuItemId === COSMOS_MENU_ID) {
      void browser.tabs.create({ url: browser.runtime.getURL("/cosmos.html") })
    }
  })
})
