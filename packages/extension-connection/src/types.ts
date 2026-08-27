import type { ExtensionCommand } from "./generated/ExtensionCommand"
import type { SerializedError } from "./generated/SerializedError"
import type { Worker } from "./generated/Worker"

export type ExtensionConnectionCommandRequest = ExtensionCommand
export type ExtensionConnectionWorker = Worker
export type ExtensionConnectionSerializedError = SerializedError

export interface ExtensionConnectionFetchResponse {
  status: number
  statusText: string
  headers: [string, string][]
  body: string
}
