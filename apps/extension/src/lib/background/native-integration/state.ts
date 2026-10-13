import type { InsightCatalogEntry, OfflineWorker as NativeOfflineWorker } from "@newsnext/sdk/models"
import type { CollectionStatus as NativeCollectionStatus, Workspace as NativeWorkspace } from "@newsnext/sdk/native-protocol"
import type { NativeIntegrationState, NativeIntegrationStatus, NativePort } from "./types"
import { normalizePersistedSettings } from "../../settings/persisted-settings"
import { getWorkerId } from "../worker-identity"

export const NATIVE_HOST_NAME = import.meta.env.DEV
  ? "app.newsnext.host.dev"
  : "app.newsnext.host"
export { PROTOCOL_VERSION } from "@newsnext/sdk/native-protocol"
export const WORKSPACE_SYNCED_AT_KEY = "newsnext-workspace-synced-at"
export const WORKSPACE_UPDATED_AT_KEY = "newsnext-workspace-updated-at"
export const NATIVE_INTEGRATION_RECONNECT_ALARM = "newsnext-native-integration-reconnect"
export const RECONNECT_ALARM_PERIOD_MINUTES = 0.5
export const NATIVE_REQUEST_TIMEOUT_MS = 65_000

function createInitialWorkspace(): NativeWorkspace {
  return {
    revision: 0,
    updatedAt: 0,
    boardOrder: [],
    boards: {},
    liveCards: {},
    liveWidgets: {},
    settings: JSON.stringify(normalizePersistedSettings(undefined)),
  }
}

interface NativeIntegrationRuntime {
  ready: boolean
  initialization: NativeIntegrationStatus["initialization"]
  startupLogs: import("@newsnext/sdk/native-protocol").LogEntry[]
  collectionSubscribed: boolean
  collectionStatus: NativeCollectionStatus | undefined
  logsSubscribed: boolean
  daemonVersion: string | undefined
  capabilities: string[]
  connectionError: NativeIntegrationStatus["connectionError"]
  connectionState: NativeIntegrationState
  enabled: boolean
  localCardIds: Set<string>
  offlineWorkers: NativeOfflineWorker[]
  port: NativePort | undefined
  reconnectAttempt: number
  reconnectTimer: ReturnType<typeof setTimeout> | undefined
  insightCatalog: InsightCatalogEntry[]
  insightServerOrigin: string | undefined
  workerId: string
  workerRoutingRevision: number
  workspace: NativeWorkspace
  pendingWorkspace: NativeWorkspace | undefined
  workspaceSyncedAt: number | undefined
  workspaceCommitQueue: Promise<void>
}

export const runtime: NativeIntegrationRuntime = {
  ready: false,
  initialization: undefined,
  startupLogs: [],
  collectionSubscribed: false,
  collectionStatus: undefined,
  logsSubscribed: false,
  daemonVersion: undefined,
  capabilities: [],
  connectionError: undefined,
  connectionState: "serviceNotRunning",
  enabled: false,
  localCardIds: new Set(),
  offlineWorkers: [],
  port: undefined,
  reconnectAttempt: 0,
  reconnectTimer: undefined,
  insightCatalog: [],
  insightServerOrigin: undefined,
  workerId: getWorkerId(),
  workerRoutingRevision: 0,
  workspace: createInitialWorkspace(),
  pendingWorkspace: undefined,
  workspaceSyncedAt: undefined,
  workspaceCommitQueue: Promise.resolve(),
}
