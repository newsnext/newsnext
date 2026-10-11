import type { NativeIntegrationFailureState } from "@newsnext/sdk/models"

export const NATIVE_INTEGRATION_RECONNECT_DELAYS_MS = [1_000, 2_000, 5_000, 15_000, 30_000] as const

export type { NativeIntegrationFailureState } from "@newsnext/sdk/models"

export function classifyNativeIntegrationFailure(
  message: string | undefined,
  code?: string,
): NativeIntegrationFailureState {
  switch (code?.toUpperCase()) {
    case "DAEMON_START_FAILED": return "daemonStartFailed"
    case "HOST_MISSING": return "hostNotInstalled"
    case "PROTOCOL_INCOMPATIBLE": return "protocolIncompatible"
    case "WORKER_ALREADY_CONNECTED": return "workerConflict"
  }
  if (/native messaging host.*(?:not found|forbidden)|no such native application/iu.test(message ?? "")) {
    return "hostNotInstalled"
  }
  return "serviceNotRunning"
}

export function getNativeIntegrationReconnectDelay(attempt: number): number {
  const index = Math.min(
    Math.max(Math.trunc(attempt), 0),
    NATIVE_INTEGRATION_RECONNECT_DELAYS_MS.length - 1,
  )
  return NATIVE_INTEGRATION_RECONNECT_DELAYS_MS[index]!
}
