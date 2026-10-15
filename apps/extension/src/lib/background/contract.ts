import type { ProxyServiceKey } from "@webext-core/proxy-service"
import type { BackgroundActionDependencies } from "./action-context"
import type { BackgroundActionService } from "./action-service"
import type { BackgroundDiagnosticsService } from "./diagnostics-service"

// UI clients import only this contract, never the background implementation.
export interface BackgroundService {
  action: BackgroundActionService
  diagnostics: BackgroundDiagnosticsService
  rankingHistory: BackgroundActionDependencies["rankingHistory"]
}

export const BACKGROUND_SERVICE_KEY = "newsnext-background-service" as ProxyServiceKey<BackgroundService>
export const BACKGROUND_LOGS_PORT = "newsnext.background-logs.subscription"
