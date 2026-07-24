import { useCallback, useEffect, useState } from "react"
import { browser } from "#imports"
import {
  getOptionalPermissionForSource,
  hasPermissionToLoadSource,
  requestPermissionToLoadSource,
} from "@/lib/source-permissions"

export interface SourcePermissionState {
  canLoad: boolean
  permissionRequired: boolean
  requestPermission: () => Promise<boolean>
}

export function useSourcePermission(sourceId: string): SourcePermissionState {
  const requiresPermission = Boolean(getOptionalPermissionForSource(sourceId))
  const [hasPermission, setHasPermission] = useState<boolean | undefined>(
    requiresPermission ? undefined : true,
  )

  useEffect(() => {
    if (!requiresPermission) {
      setHasPermission(true)
      return
    }

    let active = true
    const updatePermission = async () => {
      const granted = await hasPermissionToLoadSource(sourceId)
      if (active) {
        setHasPermission(granted)
      }
    }
    const handlePermissionChange = () => {
      void updatePermission()
    }

    setHasPermission(undefined)
    void updatePermission()
    browser.permissions.onAdded.addListener(handlePermissionChange)
    browser.permissions.onRemoved.addListener(handlePermissionChange)

    return () => {
      active = false
      browser.permissions.onAdded.removeListener(handlePermissionChange)
      browser.permissions.onRemoved.removeListener(handlePermissionChange)
    }
  }, [requiresPermission, sourceId])

  const requestPermission = useCallback(async () => {
    const granted = await requestPermissionToLoadSource(sourceId)
    setHasPermission(granted)
    return granted
  }, [sourceId])

  return {
    canLoad: hasPermission === true,
    permissionRequired: hasPermission === false,
    requestPermission,
  }
}
