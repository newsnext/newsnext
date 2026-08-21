export {
  parseExtensionConnectionCommandRequest,
} from "./command"
export type { CommandResult as NativeCommandResult } from "./generated/CommandResult"
export type { ExtensionBoard as NativeExtensionBoard } from "./generated/ExtensionBoard"
export type { ExtensionCommand as NativeExtensionCommand } from "./generated/ExtensionCommand"
export type { ExtensionInstance as NativeExtensionInstance } from "./generated/ExtensionInstance"
export type { ExtensionToHost } from "./generated/ExtensionToHost"
export type { HostToExtension } from "./generated/HostToExtension"
export type {
  ExtensionConnectionCommandRequest,
  ExtensionConnectionFetchResponse,
  ExtensionConnectionInstance,
  ExtensionConnectionSerializedError,
} from "./types"
