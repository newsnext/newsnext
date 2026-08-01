import type { SourcePermissionTarget } from "@/lib/source-permissions"
import { useCallback, useEffect, useMemo, useState } from "react"
import { browser } from "#imports"
import {
  getPermissionRequestForSource,
  getSourcePermissionDescription,
  hasSourcePermission,
  requestSourcePermission,
} from "@/lib/source-permissions"

export interface SourcePermissionState {
  canLoad: boolean
  permissionDescription: string
  permissionRequired: boolean
  requestPermission: () => Promise<boolean>
}

interface PermissionState {
  granted: boolean | undefined
  permissionKey: string
}

function createPermissionState(
  permissionKey: string,
  requiresPermission: boolean,
): PermissionState {
  return {
    granted: requiresPermission ? undefined : true,
    permissionKey,
  }
}

export function useSourcePermission(
  source: SourcePermissionTarget,
  params: Record<string, unknown>,
): SourcePermissionState {
  const permissionRequest = useMemo(
    () => getPermissionRequestForSource(source, params),
    [params, source],
  )
  const permissionKey = JSON.stringify(permissionRequest ?? null)
  const requiresPermission = permissionRequest !== undefined
  const [storedState, setStoredState] = useState<PermissionState>(() => (
    createPermissionState(permissionKey, requiresPermission)
  ))
  let permissionState = storedState
  if (storedState.permissionKey !== permissionKey) {
    permissionState = createPermissionState(permissionKey, requiresPermission)
    setStoredState(permissionState)
  }

  useEffect(() => {
    if (!requiresPermission) return

    let active = true
    const refreshPermission = async (): Promise<void> => {
      const granted = await hasSourcePermission(permissionRequest)
      if (active) {
        setStoredState({ granted, permissionKey })
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
  }, [permissionKey, permissionRequest, requiresPermission])

  const requestPermission = useCallback(async () => {
    const granted = await requestSourcePermission(permissionRequest)
    setStoredState({ granted, permissionKey })
    return granted
  }, [permissionKey, permissionRequest])

  return {
    canLoad: permissionState.granted === true,
    permissionDescription: getSourcePermissionDescription(source, permissionRequest),
    permissionRequired: permissionState.granted === false,
    requestPermission,
  }
}
