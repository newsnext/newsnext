import type { ExtensionCommand } from "./generated/ExtensionCommand"
import type { ExtensionInstance } from "./generated/ExtensionInstance"
import type { SerializedError } from "./generated/SerializedError"

export type ExtensionConnectionApplicationActionRequest
  = Extract<ExtensionCommand, { type: "application.action.execute" }>
export type ExtensionConnectionApplicationQueryRequest
  = Extract<ExtensionCommand, { type: "application.query.execute" }>
export type ExtensionConnectionFetchRequest
  = Extract<ExtensionCommand, { type: "fetch" }>
type GeneratedRunRequest = Extract<ExtensionCommand, { type: "source.run" }>

export interface ExtensionConnectionRegisteredRunRequest extends GeneratedRunRequest {
  providerId?: never
  provider?: never
  useProviderSecrets?: never
}

export interface ExtensionConnectionProviderRunRequest extends GeneratedRunRequest {
  providerId: string
  provider: unknown
  useProviderSecrets?: boolean
}

export type ExtensionConnectionRunRequest
  = | ExtensionConnectionRegisteredRunRequest
    | ExtensionConnectionProviderRunRequest

export type ExtensionConnectionCommandRequest
  = | Exclude<ExtensionCommand, { type: "source.run" }>
    | ExtensionConnectionRunRequest

export type ExtensionConnectionInstance = ExtensionInstance
export type ExtensionConnectionSerializedError = SerializedError

export interface ExtensionConnectionFetchResponse {
  status: number
  statusText: string
  headers: [string, string][]
  body: string
}
