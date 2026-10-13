import type { ExtensionCommand } from "@newsnext/sdk/native-protocol"
import { extensionCommandSchema, parseNativeValue } from "@newsnext/sdk/native-protocol"

export function parseExtensionCommand(value: unknown): ExtensionCommand {
  return parseNativeValue(extensionCommandSchema, value)
}
