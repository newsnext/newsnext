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

interface PermissionState {
  granted: boolean | undefined
  sourceId: string
}

function createPermissionState(sourceId: string): PermissionState {
  return {
    granted: getOptionalPermissionForSource(sourceId) ? undefined : true,
    sourceId,
  }
}

export function useSourcePermission(sourceId: string): SourcePermissionState {
  const requiresPermission = Boolean(getOptionalPermissionForSource(sourceId))
  const [storedState, setStoredState] = useState<PermissionState>(() => (
    createPermissionState(sourceId)
  ))
  let permissionState = storedState
  if (storedState.sourceId !== sourceId) {
    permissionState = createPermissionState(sourceId)
    setStoredState(permissionState)
  }

  useEffect(() => {
    if (!requiresPermission) return

    let active = true
    const refreshPermission = async (): Promise<void> => {
      const granted = await hasPermissionToLoadSource(sourceId)
      if (active) {
        setStoredState({ granted, sourceId })
      }
    }
    const handlePermissionChange = (): void => {
      void refreshPermission()
    }

    void refreshPermission()
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
    setStoredState({ granted, sourceId })
    return granted
  }, [sourceId])

  return {
    canLoad: permissionState.granted === true,
    permissionRequired: permissionState.granted === false,
    requestPermission,
  }
}
