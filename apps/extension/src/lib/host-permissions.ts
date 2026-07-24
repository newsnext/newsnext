import type { SourceCapabilities } from "@newsnext/source/typings"
import { browser } from "#imports"

const CAPABILITY_HOST_PATTERN = /^(?:\*|(?:\*\.)?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)$/i
const DEVELOPMENT_HOST_PERMISSION_ORIGINS = new Set([
  "http://localhost/*",
])

export function normalizeCapabilityHost(host: string): string | undefined {
  const normalizedHost = host.trim().toLowerCase()
  return CAPABILITY_HOST_PATTERN.test(normalizedHost) ? normalizedHost : undefined
}

export function getHostPermissionOrigins(
  capabilities: Pick<SourceCapabilities, "cookies" | "network">,
): string[] {
  const hosts = [
    ...capabilities.network,
    ...capabilities.cookies,
  ]
    .map(normalizeCapabilityHost)
    .filter((host): host is string => host !== undefined)

  return [...new Set(hosts.map(host => `*://${host}/*`))]
}

export async function getGrantedHostPermissionOrigins(): Promise<string[]> {
  const permissions = await browser.permissions.getAll().catch(() => undefined)
  return [...new Set(permissions?.origins ?? [])].sort()
}

export function getUserManagedHostPermissionOrigins(
  origins: readonly string[],
  isDevelopment: boolean,
): string[] {
  return isDevelopment
    ? origins.filter(origin => !DEVELOPMENT_HOST_PERMISSION_ORIGINS.has(origin))
    : [...origins]
}

export async function revokeHostPermissionOrigin(origin: string): Promise<boolean> {
  const grantedOrigins = await getGrantedHostPermissionOrigins()
  if (!grantedOrigins.includes(origin)) {
    return false
  }

  return browser.permissions.remove({ origins: [origin] }).catch(() => false)
}
