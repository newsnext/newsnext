import type { OfflineWorker } from "../protocol/OfflineWorker.js"
import type { WidgetCatalogEntry } from "../protocol/WidgetCatalogEntry.js"

export type NativeIntegrationFailureState
  = | "daemonOutdated"
    | "hostNotInstalled"
    | "protocolIncompatible"
    | "serviceNotRunning"
    | "daemonStartFailed"
    | "workerConflict"

export type NativeIntegrationState
  = | "disabled"
    | "connected"
    | "connecting"
    | "workspaceConflict"
    | NativeIntegrationFailureState

export type WorkspaceResolution = "overwrite" | "merge" | "discard"

export interface WorkspaceSummary {
  boards: number
  liveCards: number
  liveWidgets: number
}

export interface NativeIntegrationStatus {
  workspaceConflict?: {
    revision: number
    local: WorkspaceSummary
    shared: WorkspaceSummary
  }
  daemonVersion?: string
  capabilities: string[]
  offlineWorkers: OfflineWorker[]
  /** Renderable Widget definitions the daemon last published, including their entry URLs. */
  widgets: WidgetCatalogEntry[]
  connectionError?: NativeIntegrationConnectionError
  state: NativeIntegrationState
  workerId: string
  widgetServerOrigin?: string
}

export interface NativeIntegrationConnectionError {
  code?: string
  message: string
}
