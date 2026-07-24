import type { Browser } from "#imports"
import { Switch } from "@newsnext/ui/components/switch"
import { useCallback, useEffect, useState } from "react"
import { browser } from "#imports"
import {
  getGrantedHostPermissionOrigins,
  getUserManagedHostPermissionOrigins,
  revokeHostPermissionOrigin,
} from "@/lib/host-permissions"
import {
  disableRadarBadge,
  enableRadarBadge,
  isRadarBadgeActive,
  RADAR_BADGE_ENABLED_KEY,
} from "@/lib/radar-badge-settings"

function getOriginLabel(origin: string): string {
  return origin
    .replace(/^\*:\/\//, "")
    .replace(/\/\*$/, "")
}

export function PermissionsSettings() {
  const [origins, setOrigins] = useState<string[]>([])
  const [revokingOrigin, setRevokingOrigin] = useState<string>()
  const [radarBadgeEnabled, setRadarBadgeEnabled] = useState(false)
  const [updatingRadarBadge, setUpdatingRadarBadge] = useState(false)

  const refreshOrigins = useCallback(async (): Promise<void> => {
    const grantedOrigins = await getGrantedHostPermissionOrigins()
    setOrigins(getUserManagedHostPermissionOrigins(grantedOrigins, import.meta.env.DEV))
  }, [])

  const refreshRadarBadge = useCallback(async (): Promise<void> => {
    setRadarBadgeEnabled(await isRadarBadgeActive())
  }, [])

  useEffect(() => {
    const handlePermissionChange = (): void => {
      void refreshOrigins()
      void refreshRadarBadge()
    }
    const handleStorageChange = (
      changes: Record<string, Browser.storage.StorageChange>,
      areaName: string,
    ): void => {
      if (areaName === "local" && RADAR_BADGE_ENABLED_KEY in changes) {
        void refreshRadarBadge()
      }
    }

    void refreshOrigins()
    void refreshRadarBadge()
    browser.permissions.onAdded.addListener(handlePermissionChange)
    browser.permissions.onRemoved.addListener(handlePermissionChange)
    browser.storage.onChanged.addListener(handleStorageChange)

    return () => {
      browser.permissions.onAdded.removeListener(handlePermissionChange)
      browser.permissions.onRemoved.removeListener(handlePermissionChange)
      browser.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [refreshOrigins, refreshRadarBadge])

  const handleRevoke = useCallback(async (origin: string): Promise<void> => {
    setRevokingOrigin(origin)
    try {
      await revokeHostPermissionOrigin(origin)
      await refreshOrigins()
    } finally {
      setRevokingOrigin(undefined)
    }
  }, [refreshOrigins])

  const handleRadarBadgeToggle = useCallback(async (): Promise<void> => {
    setUpdatingRadarBadge(true)
    try {
      if (radarBadgeEnabled) {
        await disableRadarBadge()
      } else {
        await enableRadarBadge()
      }
      await refreshRadarBadge()
    } finally {
      setUpdatingRadarBadge(false)
    }
  }, [radarBadgeEnabled, refreshRadarBadge])

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-6 rounded-xl border p-4">
        <div className="min-w-0 space-y-1">
          <h3 className="text-sm font-medium">Radar badge</h3>
          <p className="text-sm leading-5 text-muted-foreground">
            Show the number of matching Radar sources on the extension icon. Requires optional access to tab URLs.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Switch
            checked={radarBadgeEnabled}
            disabled={updatingRadarBadge}
            aria-label="Toggle Radar badge"
            onCheckedChange={() => void handleRadarBadgeToggle()}
          />
          <span className="w-14 text-sm font-medium text-muted-foreground">
            {radarBadgeEnabled ? "On" : "Off"}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-medium">Site Access</h3>
        <p className="text-sm text-muted-foreground">
          NewsNext requests access only when a source needs a site. Revoked sources will ask again before loading.
        </p>
      </div>

      {origins.length === 0
        ? (
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              No site access has been granted.
            </div>
          )
        : (
            <ul className="divide-y rounded-xl border">
              {origins.map(origin => (
                <li key={origin} className="flex items-center justify-between gap-4 p-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{getOriginLabel(origin)}</div>
                    <div className="truncate text-xs text-muted-foreground">{origin}</div>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:bg-muted disabled:cursor-wait disabled:opacity-50"
                    disabled={revokingOrigin === origin}
                    onClick={() => void handleRevoke(origin)}
                  >
                    {revokingOrigin === origin ? "Revoking..." : "Revoke"}
                  </button>
                </li>
              ))}
            </ul>
          )}
    </div>
  )
}
