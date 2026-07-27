import type { SourceCapabilities } from "@newsnext/source/types"
import { browser } from "#imports"
import { getHostPermissionOrigins } from "@/lib/host-permissions"

type OptionalSourcePermission = "bookmarks" | "cookies" | "favicon" | "history"

function isOptionalSourcePermission(permission: string): permission is OptionalSourcePermission {
  return permission === "bookmarks"
    || permission === "cookies"
    || permission === "favicon"
    || permission === "history"
}

export interface SourcePermissionRequest {
  origins?: string[]
  permissions?: OptionalSourcePermission[]
}

export interface SourcePermissionTarget {
  capabilities: SourceCapabilities
  provider: {
    title: string
  }
  title?: string
}

export function getPermissionRequestForSource(source: SourcePermissionTarget): SourcePermissionRequest | undefined {
  const permissions = source.capabilities.browser.filter(isOptionalSourcePermission)
  if (source.capabilities.cookies.length > 0) {
    permissions.push("cookies")
  }

  const origins = getHostPermissionOrigins(source.capabilities)

  if (permissions.length === 0 && origins.length === 0) {
    return undefined
  }

  return {
    ...(origins.length > 0 ? { origins } : {}),
    ...(permissions.length > 0 ? { permissions: [...new Set(permissions)] } : {}),
  }
}

export function getSourcePermissionDescription(source: SourcePermissionTarget): string {
  const request = getPermissionRequestForSource(source)
  if (!request) {
    return "Authorize the permissions required to load this source."
  }

  const browserData = request.permissions?.filter(permission => permission !== "cookies") ?? []
  const hosts = request.origins?.map((origin) => {
    try {
      return new URL(origin.replace("*://", "https://")).hostname
    } catch {
      return origin
    }
  }) ?? []

  if (browserData.length > 0 && hosts.length === 0) {
    return `Authorize access to your browser ${source.title?.toLowerCase() ?? "data"} to continue.`
  }

  if (hosts.length === 1) {
    return `Authorize access to ${hosts[0]} to load this source.`
  }

  return `Authorize access to ${source.provider.title} services to continue.`
}

export async function hasPermissionToLoadSource(source: SourcePermissionTarget): Promise<boolean> {
  const request = getPermissionRequestForSource(source)
  if (!request) {
    return true
  }

  return browser.permissions.contains(request).catch(() => false)
}

export async function requestPermissionToLoadSource(source: SourcePermissionTarget): Promise<boolean> {
  const request = getPermissionRequestForSource(source)
  if (!request) {
    return true
  }

  return browser.permissions.request(request).catch(() => false)
}
