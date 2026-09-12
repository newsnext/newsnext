import type { OfflineWorker } from "../protocol/OfflineWorker.js"

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
  connectionError?: NativeIntegrationConnectionError
  state: NativeIntegrationState
  workerId: string
  widgetServerOrigin?: string
}

export interface NativeIntegrationConnectionError {
  code?: string
  message: string
}
