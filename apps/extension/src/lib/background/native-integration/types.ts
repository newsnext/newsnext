import type { NativeOfflineWorker } from "@newsnext/extension-connection"
import type { browser } from "#imports"
import type { NativeIntegrationFailureState } from "./connection"

export type NativeIntegrationState
  = | "disabled"
    | "connected"
    | "connecting"
    | NativeIntegrationFailureState

export interface NativeIntegrationStatus {
  daemonVersion?: string
  capabilities: string[]
  offlineWorkers: NativeOfflineWorker[]
  connectionError?: NativeIntegrationConnectionError
  state: NativeIntegrationState
  workerId: string
  widgetServerOrigin?: string
}

export interface NativeIntegrationConnectionError {
  code?: string
  message: string
}

export type NativePort = ReturnType<typeof browser.runtime.connectNative>

export type RequireNativeConnection = () => Promise<NativePort>
