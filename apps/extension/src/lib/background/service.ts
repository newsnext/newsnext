import type { ProxyServiceKey } from "@webext-core/proxy-service"
import type { BackgroundSourceService } from "./source-service"
import { createBackgroundSourceService } from "./source-service"

export interface BackgroundService {
  source: BackgroundSourceService
}

export const BACKGROUND_SERVICE_KEY = "newsnext-background-service" as ProxyServiceKey<BackgroundService>

export function createBackgroundService(): BackgroundService {
  return {
    source: createBackgroundSourceService(),
  }
}
