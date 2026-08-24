import type { ExtensionCommand } from "./generated/ExtensionCommand"
import type { Node } from "./generated/Node"
import type { SerializedError } from "./generated/SerializedError"

export type ExtensionConnectionCommandRequest = ExtensionCommand
export type ExtensionConnectionNode = Node
export type ExtensionConnectionSerializedError = SerializedError

export interface ExtensionConnectionFetchResponse {
  status: number
  statusText: string
  headers: [string, string][]
  body: string
}
