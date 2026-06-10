import { defineExtensionMessaging } from "@webext-core/messaging"

interface ProtocolMap {
  "command-bar-toggle": {
    status?: boolean
  }
  "command-bar-show": undefined
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>()
