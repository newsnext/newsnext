import type { ExtensionCommand } from "./generated/ExtensionCommand"
import type { ExtensionInstance } from "./generated/ExtensionInstance"
import type { SerializedError } from "./generated/SerializedError"

export type ExtensionConnectionCommandRequest = ExtensionCommand
export type ExtensionConnectionInstance = ExtensionInstance
export type ExtensionConnectionSerializedError = SerializedError

export interface ExtensionConnectionFetchResponse {
  status: number
  statusText: string
  headers: [string, string][]
  body: string
}
