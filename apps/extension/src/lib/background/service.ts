import type { BackgroundActionDependencies } from "./action-context"
import type { BackgroundService } from "./contract"
import type { BackgroundDiagnosticsService } from "./diagnostics-service"
import { createBackgroundActionService } from "./action-service"
import { createBackgroundDiagnosticsService } from "./diagnostics-service"

const unavailableDiagnosticsService: BackgroundDiagnosticsService = {
  clearActions: rejectBackgroundDiagnostics,
  getSnapshot: rejectBackgroundDiagnostics,
}

export function createBackgroundService(
  dependencies: BackgroundActionDependencies,
): BackgroundService {
  return {
    action: createBackgroundActionService(dependencies),
    rankingHistory: dependencies.rankingHistory,
    diagnostics: import.meta.env.DEV
      ? createBackgroundDiagnosticsService(dependencies.nativeIntegration)
      : unavailableDiagnosticsService,
  }
}

async function rejectBackgroundDiagnostics(): Promise<never> {
  throw new Error("Background diagnostics are available only in development")
}
