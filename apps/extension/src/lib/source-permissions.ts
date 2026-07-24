import { sourceDescriptors } from "@newsnext/source/metadata"
import { browser } from "@wxt-dev/browser"

type OptionalSourcePermission = "bookmarks" | "history"

function isOptionalSourcePermission(permission: string): permission is OptionalSourcePermission {
  return permission === "bookmarks" || permission === "history"
}

export function getOptionalPermissionForSource(sourceId: string): OptionalSourcePermission | undefined {
  const source = sourceDescriptors.find(descriptor => descriptor.id === sourceId)
  return source?.capabilities.browser.find(isOptionalSourcePermission)
}

export async function hasPermissionToLoadSource(sourceId: string): Promise<boolean> {
  const permission = getOptionalPermissionForSource(sourceId)
  if (!permission) {
    return true
  }

  return browser.permissions.contains({
    permissions: [permission],
  }).catch(() => false)
}

export async function requestPermissionToLoadSource(sourceId: string): Promise<boolean> {
  const permission = getOptionalPermissionForSource(sourceId)
  if (!permission) {
    return true
  }

  return browser.permissions.request({
    permissions: [permission],
  }).catch(() => false)
}
