import type { LongTaskProgress } from "../protocol/LongTaskProgress.js"
import type { OfflineWorker } from "../protocol/OfflineWorker.js"

export type { LongTaskProgress } from "../protocol/LongTaskProgress.js"

export type NativeIntegrationFailureState
  = | "hostNotInstalled"
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
  /** Transport can be connected while daemon initialization is still running. */
  ready: boolean
  initialization?: LongTaskProgress
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
  insightServerOrigin?: string
}

export interface NativeIntegrationConnectionError {
  code?: string
  message: string
}
