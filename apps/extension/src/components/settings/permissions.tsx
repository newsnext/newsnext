import { Button } from "@newsnext/ui/components/button"
import { Card, CardContent } from "@newsnext/ui/components/card"
import { useCallback, useEffect, useState } from "react"
import { browser } from "#imports"
import {
  getGrantedHostPermissionOrigins,
  getUserManagedHostPermissionOrigins,
  revokeHostPermissionOrigin,
} from "@/lib/host-permissions"
import { SettingsSection } from "./layout"

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
  const [revokingOrigin, setRevokingOrigin] = useState<string>()
  const [grantedPermissions, setGrantedPermissions] = useState<ManagedPermission[]>([])
  const [revokingPermission, setRevokingPermission] = useState<ManagedPermission>()

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
    setRevokingOrigin(origin)
    try {
      await revokeHostPermissionOrigin(origin)
      await refreshOrigins()
    } finally {
      setRevokingOrigin(undefined)
    }
  }, [refreshOrigins])

  const handleRevokePermission = useCallback(
    async (permission: ManagedPermission): Promise<void> => {
      setRevokingPermission(permission)
      try {
        await browser.permissions.remove({ permissions: [permission] }).catch(() => false)
        await refreshPermissions()
      } finally {
        setRevokingPermission(undefined)
      }
    },
    [refreshPermissions],
  )

  const visiblePermissions = MANAGED_PERMISSIONS.filter(permission => (
    grantedPermissions.includes(permission.id)
  ))

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Browser permissions"
        description="Permissions currently granted to NewsNext and what they are used for."
      >
        {visiblePermissions.length === 0
          ? (
              <Card variant="subtle">
                <CardContent className="text-sm text-muted-foreground">
                  No browser permissions have been granted.
                </CardContent>
              </Card>
            )
          : (
              <Card variant="subtle">
                <CardContent className="p-0">
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
                          disabled={revokingPermission === permission.id}
                          onClick={() => void handleRevokePermission(permission.id)}
                        >
                          {revokingPermission === permission.id ? "Revoking..." : "Revoke"}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
      </SettingsSection>

      <SettingsSection
        title="Site access"
        description="NewsNext requests access only when a source needs a site. Revoked sources will ask again before loading."
      >
        {origins.length === 0
          ? (
              <Card variant="subtle">
                <CardContent className="text-sm text-muted-foreground">
                  No site access has been granted.
                </CardContent>
              </Card>
            )
          : (
              <Card variant="subtle">
                <CardContent className="p-0">
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
                          disabled={revokingOrigin === origin}
                          onClick={() => void handleRevokeOrigin(origin)}
                        >
                          {revokingOrigin === origin ? "Revoking..." : "Revoke"}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
      </SettingsSection>
    </div>
  )
}
