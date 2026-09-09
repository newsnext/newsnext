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
    | NativeIntegrationFailureState

export interface NativeIntegrationStatus {
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
