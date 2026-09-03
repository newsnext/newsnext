import type { NativeOfflineWorker, NativeWorkspace } from "@newsnext/extension-connection"
import type { NativeIntegrationState, NativeIntegrationStatus, NativePort } from "./types"
import { normalizePersistedSettings } from "../../settings/persisted-settings"
import { getWorkerId } from "../worker-identity"

export const NATIVE_HOST_NAME = import.meta.env.DEV
  ? "app.newsnext.host.dev"
  : "app.newsnext.host"
export const PROTOCOL_VERSION = 21
export const WORKSPACE_UPDATED_AT_KEY = "newsnext-workspace-updated-at"
// Keep the persisted alarm name stable across the module rename.
export const NATIVE_INTEGRATION_RECONNECT_ALARM = "app-integration-native-reconnect"
export const RECONNECT_ALARM_PERIOD_MINUTES = 0.5
export const NATIVE_REQUEST_TIMEOUT_MS = 65_000

function createInitialWorkspace(): NativeWorkspace {
  return {
    revision: 0,
    updatedAt: 0,
    boards: [],
    instances: [],
    settings: JSON.stringify(normalizePersistedSettings(undefined)),
  }
}

interface NativeIntegrationRuntime {
  appVersion: string | undefined
  capabilities: string[]
  connectionError: NativeIntegrationStatus["connectionError"]
  connectionState: NativeIntegrationState
  enabled: boolean
  localInstanceIds: Set<string>
  offlineWorkers: NativeOfflineWorker[]
  port: NativePort | undefined
  reconnectAttempt: number
  reconnectTimer: ReturnType<typeof setTimeout> | undefined
  widgetServerUrl: string | undefined
  workerId: string
  workerRoutingRevision: number
  workspace: NativeWorkspace
  workspaceCommitQueue: Promise<void>
}

export const runtime: NativeIntegrationRuntime = {
  appVersion: undefined,
  capabilities: [],
  connectionError: undefined,
  connectionState: "serviceNotRunning",
  enabled: false,
  localInstanceIds: new Set(),
  offlineWorkers: [],
  port: undefined,
  reconnectAttempt: 0,
  reconnectTimer: undefined,
  widgetServerUrl: undefined,
  workerId: getWorkerId(),
  workerRoutingRevision: 0,
  workspace: createInitialWorkspace(),
  workspaceCommitQueue: Promise.resolve(),
}
