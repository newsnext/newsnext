import type { BackgroundService } from "./background/service"
import { createProxyService } from "@webext-core/proxy-service"
import { browser } from "@wxt-dev/browser"
import { BACKGROUND_SERVICE_KEY } from "./background/service"

export function createBackgroundClient(): BackgroundService | undefined {
  if (!browser.runtime?.id) {
    return undefined
  }

  return createProxyService(BACKGROUND_SERVICE_KEY)
}
