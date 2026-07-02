import { registerService } from "@webext-core/proxy-service"
import { browser } from "wxt/browser"
import { defineBackground } from "#imports"
import { BACKGROUND_SERVICE_KEY, createBackgroundService } from "@/lib/background/service"

const backgroundService = createBackgroundService()

interface SidePanelApi {
  setPanelBehavior?: (behavior: { openPanelOnActionClick: boolean }) => Promise<void>
}

export default defineBackground(() => {
  registerService(BACKGROUND_SERVICE_KEY, backgroundService)

  const sidePanel = (browser as typeof browser & { sidePanel?: SidePanelApi }).sidePanel

  void sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true }).catch((error: unknown) => {
    console.error("Failed to configure side panel behavior", error)
  })
})
