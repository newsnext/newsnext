import type { SourcePermissionTarget } from "@/lib/source-permissions"
import { useCallback, useEffect, useState } from "react"
import { browser } from "#imports"
import {
  getPermissionRequestForSource,
  hasPermissionToLoadSource,
  requestPermissionToLoadSource,
} from "@/lib/source-permissions"

interface SourcePermissionHookTarget extends SourcePermissionTarget {
  sourceId: string
}

export interface SourcePermissionState {
  canLoad: boolean
  permissionRequired: boolean
  requestPermission: () => Promise<boolean>
}

interface PermissionState {
  granted: boolean | undefined
  permissionKey: string
}

function getSourcePermissionKey(source: SourcePermissionHookTarget): string {
  return `${source.sourceId}:${JSON.stringify(getPermissionRequestForSource(source) ?? null)}`
}

function createPermissionState(source: SourcePermissionHookTarget): PermissionState {
  return {
    granted: getPermissionRequestForSource(source) ? undefined : true,
    permissionKey: getSourcePermissionKey(source),
  }
}

export function useSourcePermission(source: SourcePermissionHookTarget): SourcePermissionState {
  const permissionKey = getSourcePermissionKey(source)
  const requiresPermission = Boolean(getPermissionRequestForSource(source))
  const [storedState, setStoredState] = useState<PermissionState>(() => (
    createPermissionState(source)
  ))
  let permissionState = storedState
  if (storedState.permissionKey !== permissionKey) {
    permissionState = createPermissionState(source)
    setStoredState(permissionState)
  }

  useEffect(() => {
    if (!requiresPermission) return

    let active = true
    const refreshPermission = async (): Promise<void> => {
      const granted = await hasPermissionToLoadSource(source)
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
  }, [permissionKey, requiresPermission, source])

  const requestPermission = useCallback(async () => {
    const granted = await requestPermissionToLoadSource(source)
    setStoredState({ granted, permissionKey })
    return granted
  }, [permissionKey, source])

  return {
    canLoad: permissionState.granted === true,
    permissionRequired: permissionState.granted === false,
    requestPermission,
  }
}
