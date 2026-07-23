import { browser } from "wxt/browser"

type OptionalSourcePermission = "bookmarks" | "history"

const OPTIONAL_SOURCE_PERMISSIONS: Partial<Record<string, OptionalSourcePermission>> = {
  "browser:bookmarks": "bookmarks",
  "browser:history": "history",
}

export function getOptionalPermissionForSource(sourceId: string): OptionalSourcePermission | undefined {
  return OPTIONAL_SOURCE_PERMISSIONS[sourceId]
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
