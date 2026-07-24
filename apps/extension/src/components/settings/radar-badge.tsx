import type { Browser } from "#imports"
import { Switch } from "@newsnext/ui/components/switch"
import { useCallback, useEffect, useState } from "react"
import { browser } from "#imports"
import {
  disableRadarBadge,
  enableRadarBadge,
  isRadarBadgeActive,
  RADAR_BADGE_ENABLED_KEY,
} from "@/lib/radar-badge-settings"

export function RadarBadgeSetting() {
  const [enabled, setEnabled] = useState(false)
  const [updating, setUpdating] = useState(false)

  const refresh = useCallback(async (): Promise<void> => {
    setEnabled(await isRadarBadgeActive())
  }, [])

  useEffect(() => {
    const handlePermissionChange = (): void => {
      void refresh()
    }
    const handleStorageChange = (
      changes: Record<string, Browser.storage.StorageChange>,
      areaName: string,
    ): void => {
      if (areaName === "local" && RADAR_BADGE_ENABLED_KEY in changes) {
        void refresh()
      }
    }

    void refresh()
    browser.permissions.onAdded.addListener(handlePermissionChange)
    browser.permissions.onRemoved.addListener(handlePermissionChange)
    browser.storage.onChanged.addListener(handleStorageChange)

    return () => {
      browser.permissions.onAdded.removeListener(handlePermissionChange)
      browser.permissions.onRemoved.removeListener(handlePermissionChange)
      browser.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [refresh])

  const handleToggle = useCallback(async (): Promise<void> => {
    setUpdating(true)
    try {
      if (enabled) {
        await disableRadarBadge()
      } else {
        await enableRadarBadge()
      }
      await refresh()
    } finally {
      setUpdating(false)
    }
  }, [enabled, refresh])

  return (
    <div className="flex items-center justify-between gap-6 rounded-xl border p-4">
      <div className="min-w-0 space-y-1">
        <h3 className="text-sm font-medium">Radar badge</h3>
        <p className="text-sm leading-5 text-muted-foreground">
          Show matching Radar source counts on the extension icon. Requires Tabs permission to read open tab URLs and titles.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Switch
          checked={enabled}
          disabled={updating}
          aria-label="Toggle Radar badge"
          onCheckedChange={() => void handleToggle()}
        />
        <span className="w-14 text-sm font-medium text-muted-foreground">
          {enabled ? "On" : "Off"}
        </span>
      </div>
    </div>
  )
}
