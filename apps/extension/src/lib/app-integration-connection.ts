export const APP_INTEGRATION_RECONNECT_DELAYS_MS = [1_000, 2_000, 5_000, 15_000, 30_000] as const

export type AppIntegrationFailureState
  = | "hostNotInstalled"
    | "protocolIncompatible"
    | "serviceNotRunning"
    | "workerConflict"

export function classifyAppIntegrationFailure(
  message: string | undefined,
): AppIntegrationFailureState {
  if (/protocol version/iu.test(message ?? "")) return "protocolIncompatible"
  if (/worker is already connected/iu.test(message ?? "")) return "workerConflict"
  if (/native messaging host.*(?:not found|forbidden)|no such native application/iu.test(message ?? "")) {
    return "hostNotInstalled"
  }
  return "serviceNotRunning"
}

export function getAppIntegrationReconnectDelay(attempt: number): number {
  const index = Math.min(
    Math.max(Math.trunc(attempt), 0),
    APP_INTEGRATION_RECONNECT_DELAYS_MS.length - 1,
  )
  return APP_INTEGRATION_RECONNECT_DELAYS_MS[index]!
}
