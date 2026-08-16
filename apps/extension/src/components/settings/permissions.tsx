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

function getOriginLabel(origin: string): string {
  return origin
    .replace(/^\*:\/\//, "")
    .replace(/\/\*$/, "")
}

export function PermissionsSettings() {
  const [origins, setOrigins] = useState<string[]>([])
  const {
    error: revokeError,
    isPending: isRevoking,
    run: runRevoke,
  } = useKeyedAsyncAction<string>("NewsNext could not revoke this permission.")

  const refreshOrigins = useCallback(async (): Promise<void> => {
    const grantedOrigins = await getGrantedHostPermissionOrigins()
    setOrigins(getUserManagedHostPermissionOrigins(grantedOrigins, import.meta.env.DEV))
  }, [])

  useEffect(() => {
    const handlePermissionChange = (): void => {
      void refreshOrigins()
    }

    void refreshOrigins()
    browser.permissions.onAdded.addListener(handlePermissionChange)
    browser.permissions.onRemoved.addListener(handlePermissionChange)

    return () => {
      browser.permissions.onAdded.removeListener(handlePermissionChange)
      browser.permissions.onRemoved.removeListener(handlePermissionChange)
    }
  }, [refreshOrigins])

  const handleRevokeOrigin = useCallback(async (origin: string): Promise<void> => {
    await runRevoke(origin, async () => {
      await revokeHostPermissionOrigin(origin)
      await refreshOrigins()
    }, "NewsNext could not revoke this site access.")
  }, [refreshOrigins, runRevoke])

  return (
    <>
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
      {revokeError && <p role="alert" className="mt-6 text-sm text-destructive">{revokeError}</p>}
    </>
  )
}
