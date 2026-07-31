import type { BackgroundService } from "./background/service"
import { createProxyService } from "@webext-core/proxy-service"
import { BACKGROUND_SERVICE_KEY } from "./background/service"

export function createBackgroundClient(): BackgroundService {
  return createProxyService(BACKGROUND_SERVICE_KEY)
}
