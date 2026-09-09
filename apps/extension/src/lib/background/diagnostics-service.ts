import type { CollectionStatus as NativeCollectionStatus } from "@newsnext/sdk/protocol/CollectionStatus"
import type { ApplicationData } from "../application"
import type {
  PersistedSettings,
} from "../settings"
import type { BackgroundActionDependencies } from "./action-context"
import type { BackgroundActionRecord } from "./action-dispatcher"
import { browser } from "#imports"
import {
  normalizePersistedSettings,
  PERSISTED_DATA_SLICES,
} from "../settings"
import {
  clearBackgroundActions,
  listBackgroundActions,
  subscribeBackgroundActions,
} from "./action-dispatcher"
import { readApplicationData } from "./application-service"
import { BACKGROUND_DIAGNOSTICS_CHANGED, BACKGROUND_DIAGNOSTICS_PORT } from "./diagnostics-events"

export interface BackgroundDiagnosticsSnapshot {
  actions: BackgroundActionRecord[]
  application: ApplicationData
  settings: PersistedSettings
  collection: { status: NativeCollectionStatus | null, error: string | null }
}

export interface BackgroundDiagnosticsService {
  clearActions: () => Promise<void>
  getSnapshot: () => Promise<BackgroundDiagnosticsSnapshot>
}

let diagnosticsEventsStarted = false
const diagnosticsStorageKeys = [
  PERSISTED_DATA_SLICES.application.key,
  PERSISTED_DATA_SLICES.settings.key,
]

export function createBackgroundDiagnosticsService(nativeIntegration: BackgroundActionDependencies["nativeIntegration"]): BackgroundDiagnosticsService {
  startDiagnosticsEvents(nativeIntegration)
  return {
    async clearActions(): Promise<void> {
      clearBackgroundActions()
    },
    async getSnapshot(): Promise<BackgroundDiagnosticsSnapshot> {
      const [application, stored, collection] = await Promise.all([
        readApplicationData(),
        browser.storage.local.get([
          PERSISTED_DATA_SLICES.settings.key,
        ]),
        readCollectionDiagnostics(nativeIntegration),
      ])
      return {
        actions: listBackgroundActions(),
        collection,
        application,
        settings: normalizePersistedSettings(
          stored[PERSISTED_DATA_SLICES.settings.key],
        ),
      }
    },
  }
}

function startDiagnosticsEvents(nativeIntegration: BackgroundActionDependencies["nativeIntegration"]): void {
  if (diagnosticsEventsStarted) return
  diagnosticsEventsStarted = true

  const broadcastChange = (): void => {
    void browser.runtime.sendMessage({
      type: BACKGROUND_DIAGNOSTICS_CHANGED,
    }).catch(() => undefined)
  }
  const subscriptions = new Set<ReturnType<typeof browser.runtime.connect>>()
  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== BACKGROUND_DIAGNOSTICS_PORT) return
    subscriptions.add(port)
    if (subscriptions.size === 1) nativeIntegration.setCollectionSubscribed(true)
    port.onDisconnect.addListener(() => {
      subscriptions.delete(port)
      if (subscriptions.size === 0) nativeIntegration.setCollectionSubscribed(false)
    })
  })
  subscribeBackgroundActions(broadcastChange)
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return
    if (diagnosticsStorageKeys.some(key => key in changes)) broadcastChange()
  })
}

async function readCollectionDiagnostics(nativeIntegration: BackgroundActionDependencies["nativeIntegration"]): Promise<BackgroundDiagnosticsSnapshot["collection"]> {
  try {
    const connection = await nativeIntegration.getStatus()
    if (connection.state !== "connected") return { status: null, error: `NewsNext App is ${connection.state}. Automatic collection requires a connected daemon.` }
    return { status: await nativeIntegration.getCollectionStatus(), error: null }
  } catch (error) {
    return { status: null, error: error instanceof Error ? error.message : String(error) }
  }
}
