import type { ProxyServiceKey } from "@webext-core/proxy-service"
import type { BackgroundRegistryService } from "./registry-service"
import type { BackgroundSourceService } from "./source-service"
import { createBackgroundRegistryService } from "./registry-service"
import { createBackgroundSourceService } from "./source-service"

export interface BackgroundService {
  registry: BackgroundRegistryService
  source: BackgroundSourceService
}

export const BACKGROUND_SERVICE_KEY = "newsnext-background-service" as ProxyServiceKey<BackgroundService>

export function createBackgroundService(): BackgroundService {
  return {
    registry: createBackgroundRegistryService(),
    source: createBackgroundSourceService(),
  }
}
