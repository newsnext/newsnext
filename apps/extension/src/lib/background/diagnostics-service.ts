import type { ApplicationData } from "../application"
import type {
  PersistedDeviceState,
  PersistedSettings,
} from "../settings"
import type { BackgroundActionRecord } from "./action-dispatcher"
import { browser } from "#imports"
import {
  normalizePersistedDeviceState,
  normalizePersistedSettings,
  PERSISTED_DATA_SLICES,
} from "../settings"
import {
  clearBackgroundActions,
  listBackgroundActions,
  subscribeBackgroundActions,
} from "./action-dispatcher"
import { readConnectedApplicationData } from "./application-service"
import { BACKGROUND_DIAGNOSTICS_CHANGED } from "./diagnostics-events"

export interface BackgroundDiagnosticsSnapshot {
  actions: BackgroundActionRecord[]
  application: ApplicationData
  deviceState: PersistedDeviceState
  settings: PersistedSettings
}

export interface BackgroundDiagnosticsService {
  clearActions: () => Promise<void>
  getSnapshot: () => Promise<BackgroundDiagnosticsSnapshot>
}

let diagnosticsEventsStarted = false
const diagnosticsStorageKeys = [
  PERSISTED_DATA_SLICES.application.key,
  PERSISTED_DATA_SLICES.deviceState.key,
  PERSISTED_DATA_SLICES.settings.key,
]

export function createBackgroundDiagnosticsService(): BackgroundDiagnosticsService {
  startDiagnosticsEvents()
  return {
    async clearActions(): Promise<void> {
      clearBackgroundActions()
    },
    async getSnapshot(): Promise<BackgroundDiagnosticsSnapshot> {
      const [application, stored] = await Promise.all([
        readConnectedApplicationData(),
        browser.storage.local.get([
          PERSISTED_DATA_SLICES.deviceState.key,
          PERSISTED_DATA_SLICES.settings.key,
        ]),
      ])
      return {
        actions: listBackgroundActions(),
        application,
        deviceState: normalizePersistedDeviceState(
          stored[PERSISTED_DATA_SLICES.deviceState.key],
        ),
        settings: normalizePersistedSettings(
          stored[PERSISTED_DATA_SLICES.settings.key],
        ),
      }
    },
  }
}

function startDiagnosticsEvents(): void {
  if (diagnosticsEventsStarted) return
  diagnosticsEventsStarted = true

  const broadcastChange = (): void => {
    void browser.runtime.sendMessage({
      type: BACKGROUND_DIAGNOSTICS_CHANGED,
    }).catch(() => undefined)
  }
  subscribeBackgroundActions(broadcastChange)
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return
    if (diagnosticsStorageKeys.some(key => key in changes)) broadcastChange()
  })
}
