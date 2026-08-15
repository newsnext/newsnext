import { Button } from "@newsnext/ui/components/button"
import { useCallback, useEffect, useState } from "react"
import { browser } from "#imports"
import { ConfigSection } from "@/components/common/config-section"
import { useKeyedAsyncAction } from "@/hooks/use-async-action"
import {
  getGrantedHostPermissionOrigins,
  getUserManagedHostPermissionOrigins,
  revokeHostPermissionOrigin,
} from "@/lib/source"

const MANAGED_PERMISSIONS = [
  {
    id: "bookmarks",
    label: "Bookmarks",
    description: "Reads browser bookmarks to load the Bookmarks source.",
  },
  {
    id: "history",
    label: "History",
    description: "Reads browser history to load the History source.",
  },
] as const satisfies ReadonlyArray<{
  description: string
  id: string
  label: string
}>

type ManagedPermission = typeof MANAGED_PERMISSIONS[number]["id"]

function getOriginLabel(origin: string): string {
  return origin
    .replace(/^\*:\/\//, "")
    .replace(/\/\*$/, "")
}

export function PermissionsSettings() {
  const [origins, setOrigins] = useState<string[]>([])
  const [grantedPermissions, setGrantedPermissions] = useState<ManagedPermission[]>([])
  const {
    error: revokeError,
    isPending: isRevoking,
    run: runRevoke,
  } = useKeyedAsyncAction<string>("NewsNext could not revoke this permission.")

  const refreshOrigins = useCallback(async (): Promise<void> => {
    const grantedOrigins = await getGrantedHostPermissionOrigins()
    setOrigins(getUserManagedHostPermissionOrigins(grantedOrigins, import.meta.env.DEV))
  }, [])

  const refreshPermissions = useCallback(async (): Promise<void> => {
    const permissions = await Promise.all(
      MANAGED_PERMISSIONS.map(async permission => ({
        permission: permission.id,
        granted: await browser.permissions.contains({ permissions: [permission.id] }),
      })),
    )
    setGrantedPermissions(
      permissions.filter(permission => permission.granted).map(permission => permission.permission),
    )
  }, [])

  useEffect(() => {
    const handlePermissionChange = (): void => {
      void refreshOrigins()
      void refreshPermissions()
    }

    void refreshOrigins()
    void refreshPermissions()
    browser.permissions.onAdded.addListener(handlePermissionChange)
    browser.permissions.onRemoved.addListener(handlePermissionChange)

    return () => {
      browser.permissions.onAdded.removeListener(handlePermissionChange)
      browser.permissions.onRemoved.removeListener(handlePermissionChange)
    }
  }, [refreshOrigins, refreshPermissions])

  const handleRevokeOrigin = useCallback(async (origin: string): Promise<void> => {
    await runRevoke(origin, async () => {
      await revokeHostPermissionOrigin(origin)
      await refreshOrigins()
    }, "NewsNext could not revoke this site access.")
  }, [refreshOrigins, runRevoke])

  const handleRevokePermission = useCallback(
    async (permission: ManagedPermission): Promise<void> => {
      await runRevoke(permission, async () => {
        await browser.permissions.remove({ permissions: [permission] }).catch(() => false)
        await refreshPermissions()
      })
    },
    [refreshPermissions, runRevoke],
  )

  const visiblePermissions = MANAGED_PERMISSIONS.filter(permission => (
    grantedPermissions.includes(permission.id)
  ))

  return (
    <div className="space-y-6">
      <ConfigSection
        title="Browser permissions"
        description="Permissions currently granted to NewsNext and what they are used for."
        surfaceClassName="p-0"
      >
        {visiblePermissions.length === 0
          ? (
              <p className="p-4 text-sm text-muted-foreground">
                No browser permissions have been granted.
              </p>
            )
          : (
              <ul className="divide-y divide-border/50">
                {visiblePermissions.map(permission => (
                  <li key={permission.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="min-w-0 space-y-1">
                      <div className="text-sm font-medium">{permission.label}</div>
                      <div className="text-xs leading-5 text-muted-foreground">
                        {permission.description}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="xs"
                      disabled={isRevoking(permission.id)}
                      onClick={() => void handleRevokePermission(permission.id)}
                    >
                      {isRevoking(permission.id) ? "Revoking..." : "Revoke"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
      </ConfigSection>

      <ConfigSection
        title="Site access"
        description="NewsNext requests access when a source needs a site. Revoked access is requested again when required."
        surfaceClassName="p-0"
      >
        {origins.length === 0
          ? (
              <p className="p-4 text-sm text-muted-foreground">
                No site access has been granted.
              </p>
            )
          : (
              <ul className="divide-y divide-border/50">
                {origins.map(origin => (
                  <li key={origin} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{getOriginLabel(origin)}</div>
                      <div className="truncate text-xs text-muted-foreground">{origin}</div>
                    </div>
                    <Button
                      variant="outline"
                      size="xs"
                      disabled={isRevoking(origin)}
                      onClick={() => void handleRevokeOrigin(origin)}
                    >
                      {isRevoking(origin) ? "Revoking..." : "Revoke"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
      </ConfigSection>
      {revokeError && <p role="alert" className="text-sm text-destructive">{revokeError}</p>}
    </div>
  )
}
