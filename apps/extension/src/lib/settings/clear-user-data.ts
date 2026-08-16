import { browser } from "#imports"
import { clearSourceCache } from "../source/cache"
import { getUserManagedHostPermissionOrigins } from "../source/host-permissions"
import { OPTIONAL_SOURCE_PERMISSIONS } from "../source/permission-constants"
import { PERSISTED_DATA_SLICES } from "./persisted-data"

export async function clearNonPortableUserData(): Promise<void> {
  const granted = await browser.permissions.getAll().catch(() => undefined)
  const optionalPermissions = OPTIONAL_SOURCE_PERMISSIONS.filter(permission => (
    granted?.permissions?.includes(permission)
  ))
  const userManagedOrigins = getUserManagedHostPermissionOrigins(
    granted?.origins ?? [],
    import.meta.env.DEV,
  )
  const hasPermissionsToRevoke = optionalPermissions.length > 0
    || userManagedOrigins.length > 0

  await Promise.all([
    browser.storage.local.remove(PERSISTED_DATA_SLICES.secrets.key),
    clearSourceCache(),
    ...(hasPermissionsToRevoke
      ? [browser.permissions.remove({
          ...(optionalPermissions.length > 0
            ? { permissions: optionalPermissions }
            : {}),
          ...(userManagedOrigins.length > 0 ? { origins: userManagedOrigins } : {}),
        }).catch(() => false)]
      : []),
  ])
}
