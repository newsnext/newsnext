import type { ProxyServiceKey } from "@webext-core/proxy-service"
import type { BackgroundApplicationService } from "./application-service-proxy"
import type { BackgroundSourceConnectionService } from "./source-connection-service"
import type { BackgroundSourceService } from "./source-service"
import { createBackgroundApplicationService } from "./application-service-proxy"
import { createBackgroundSourceConnectionService } from "./source-connection-service"
import { createBackgroundSourceService } from "./source-service"

export interface BackgroundService {
  application: BackgroundApplicationService
  source: BackgroundSourceService
  sourceConnection: BackgroundSourceConnectionService
}

export const BACKGROUND_SERVICE_KEY = "newsnext-background-service" as ProxyServiceKey<BackgroundService>

export function createBackgroundService(): BackgroundService {
  return {
    application: createBackgroundApplicationService(),
    source: createBackgroundSourceService(),
    sourceConnection: createBackgroundSourceConnectionService(),
  }
}
