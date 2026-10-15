import type { BackgroundService } from "./contract"
import { createProxyService } from "@webext-core/proxy-service"
import { BACKGROUND_SERVICE_KEY } from "./contract"

export function createBackgroundClient(): BackgroundService {
  return createProxyService(BACKGROUND_SERVICE_KEY)
}
