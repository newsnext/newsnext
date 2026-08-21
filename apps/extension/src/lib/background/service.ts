import type { ProxyServiceKey } from "@webext-core/proxy-service"
import type { BackgroundApplicationService } from "./application-service-proxy"
import type { BackgroundDiagnosticsService } from "./diagnostics-service"
import type { BackgroundRadarService } from "./radar-service"
import type { BackgroundSourceConnectionService } from "./source-connection-service"
import type { BackgroundSourceService } from "./source-service"
import { instrumentBackgroundService } from "./action-dispatcher"
import { createBackgroundApplicationService } from "./application-service-proxy"
import { createBackgroundDiagnosticsService } from "./diagnostics-service"
import { createBackgroundRadarService } from "./radar-service"
import { createBackgroundSourceConnectionService } from "./source-connection-service"
import { createBackgroundSourceService } from "./source-service"

export interface BackgroundService {
  application: BackgroundApplicationService
  diagnostics: BackgroundDiagnosticsService
  radar: BackgroundRadarService
  source: BackgroundSourceService
  sourceConnection: BackgroundSourceConnectionService
}

export const BACKGROUND_SERVICE_KEY = "newsnext-background-service" as ProxyServiceKey<BackgroundService>

const unavailableDiagnosticsService: BackgroundDiagnosticsService = {
  clearActions: rejectBackgroundDiagnostics,
  getSnapshot: rejectBackgroundDiagnostics,
}

export function createBackgroundService(): BackgroundService {
  return {
    application: instrumentUiService(
      "application",
      createBackgroundApplicationService(),
    ),
    diagnostics: import.meta.env.DEV
      ? createBackgroundDiagnosticsService()
      : unavailableDiagnosticsService,
    radar: instrumentUiService(
      "radar",
      createBackgroundRadarService(),
    ),
    source: instrumentUiService(
      "source",
      createBackgroundSourceService(),
    ),
    sourceConnection: instrumentUiService(
      "sourceConnection",
      createBackgroundSourceConnectionService(),
    ),
  }
}

function instrumentUiService<Service extends object>(
  namespace: string,
  service: Service,
): Service {
  return instrumentBackgroundService(namespace, service, "ui")
}

async function rejectBackgroundDiagnostics(): Promise<never> {
  throw new Error("Background diagnostics are available only in development")
}
