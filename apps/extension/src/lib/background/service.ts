import type { ProxyServiceKey } from "@webext-core/proxy-service"
import type { BackgroundApplicationService } from "./application-service-proxy"
import type { BackgroundRadarService } from "./radar-service"
import type { BackgroundSourceConnectionService } from "./source-connection-service"
import type { BackgroundSourceService } from "./source-service"
import { createBackgroundApplicationService } from "./application-service-proxy"
import { createBackgroundRadarService } from "./radar-service"
import { createBackgroundSourceConnectionService } from "./source-connection-service"
import { createBackgroundSourceService } from "./source-service"

export interface BackgroundService {
  application: BackgroundApplicationService
  radar: BackgroundRadarService
  source: BackgroundSourceService
  sourceConnection: BackgroundSourceConnectionService
}

export const BACKGROUND_SERVICE_KEY = "newsnext-background-service" as ProxyServiceKey<BackgroundService>

export function createBackgroundService(): BackgroundService {
  return {
    application: createBackgroundApplicationService(),
    radar: createBackgroundRadarService(),
    source: createBackgroundSourceService(),
    sourceConnection: createBackgroundSourceConnectionService(),
  }
}
