import type { BackgroundService } from "./service"
import { createProxyService } from "@webext-core/proxy-service"
import { BACKGROUND_SERVICE_KEY } from "./service"

export function createBackgroundClient(): BackgroundService {
  return createProxyService(BACKGROUND_SERVICE_KEY)
}
