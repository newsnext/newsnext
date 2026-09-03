import type { ProxyServiceKey } from "@webext-core/proxy-service"
import type { NativeIntegrationActions } from "./action-context"
import type { BackgroundActionService } from "./action-service"
import type { BackgroundDiagnosticsService } from "./diagnostics-service"
import { createBackgroundActionService } from "./action-service"
import { createBackgroundDiagnosticsService } from "./diagnostics-service"

export interface BackgroundService {
  action: BackgroundActionService
  diagnostics: BackgroundDiagnosticsService
}

export const BACKGROUND_SERVICE_KEY = "newsnext-background-service" as ProxyServiceKey<BackgroundService>

const unavailableDiagnosticsService: BackgroundDiagnosticsService = {
  clearActions: rejectBackgroundDiagnostics,
  getSnapshot: rejectBackgroundDiagnostics,
}

export function createBackgroundService(
  nativeIntegration: NativeIntegrationActions,
): BackgroundService {
  return {
    action: createBackgroundActionService(nativeIntegration),
    diagnostics: import.meta.env.DEV
      ? createBackgroundDiagnosticsService()
      : unavailableDiagnosticsService,
  }
}

async function rejectBackgroundDiagnostics(): Promise<never> {
  throw new Error("Background diagnostics are available only in development")
}
