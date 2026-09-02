export const APP_INTEGRATION_RECONNECT_DELAYS_MS = [1_000, 2_000, 5_000, 15_000, 30_000] as const
// Raise this only when the extension actually drops support for an older daemon release.
export const MINIMUM_DAEMON_VERSION = "1.0.0-beta.3"

export type AppIntegrationFailureState
  = | "daemonOutdated"
    | "hostNotInstalled"
    | "protocolIncompatible"
    | "serviceNotRunning"
    | "workerConflict"

export function classifyAppIntegrationFailure(
  message: string | undefined,
  code?: string,
): AppIntegrationFailureState {
  switch (code?.toUpperCase()) {
    case "DAEMON_OUTDATED": return "daemonOutdated"
    case "HOST_MISSING": return "hostNotInstalled"
    case "PROTOCOL_INCOMPATIBLE":
    case "PROTOCOL_MISMATCH": return "protocolIncompatible"
    case "WORKER_ALREADY_CONNECTED": return "workerConflict"
  }
  if (/protocol version/iu.test(message ?? "")) return "protocolIncompatible"
  if (/worker is already connected/iu.test(message ?? "")) return "workerConflict"
  if (/native messaging host.*(?:not found|forbidden)|no such native application/iu.test(message ?? "")) {
    return "hostNotInstalled"
  }
  return "serviceNotRunning"
}

export function isVersionAtLeast(actual: string, minimum: string): boolean {
  const actualVersion = parseVersion(actual)
  const minimumVersion = parseVersion(minimum)
  if (!actualVersion || !minimumVersion) return false
  for (let index = 0; index < 3; index += 1) {
    const difference = actualVersion.release[index]! - minimumVersion.release[index]!
    if (difference !== 0) return difference > 0
  }
  if (actualVersion.prerelease.length === 0) return true
  if (minimumVersion.prerelease.length === 0) return false
  const length = Math.max(actualVersion.prerelease.length, minimumVersion.prerelease.length)
  for (let index = 0; index < length; index += 1) {
    const actualPart = actualVersion.prerelease[index]
    const minimumPart = minimumVersion.prerelease[index]
    if (actualPart === undefined) return false
    if (minimumPart === undefined) return true
    if (actualPart === minimumPart) continue
    const actualNumber = /^\d+$/u.test(actualPart) ? Number(actualPart) : undefined
    const minimumNumber = /^\d+$/u.test(minimumPart) ? Number(minimumPart) : undefined
    if (actualNumber !== undefined && minimumNumber !== undefined) return actualNumber > minimumNumber
    if (actualNumber !== undefined) return false
    if (minimumNumber !== undefined) return true
    return actualPart > minimumPart
  }
  return true
}

function parseVersion(value: string): { prerelease: string[], release: number[] } | undefined {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([\dA-Za-z.-]+))?(?:\+[\dA-Za-z.-]+)?$/u.exec(value)
  if (!match) return undefined
  return {
    prerelease: match[4]?.split(".") ?? [],
    release: [Number(match[1]), Number(match[2]), Number(match[3])],
  }
}

export function getAppIntegrationReconnectDelay(attempt: number): number {
  const index = Math.min(
    Math.max(Math.trunc(attempt), 0),
    APP_INTEGRATION_RECONNECT_DELAYS_MS.length - 1,
  )
  return APP_INTEGRATION_RECONNECT_DELAYS_MS[index]!
}
