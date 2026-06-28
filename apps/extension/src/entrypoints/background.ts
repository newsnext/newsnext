import { RPCHandler } from "@orpc/server/message-port"
import { browser } from "wxt/browser"
import { defineBackground } from "#imports"
import { backgroundRouter } from "@/lib/background-orpc"
import { BACKGROUND_ORPC_PORT_NAME } from "@/lib/background-rpc-shared"

const backgroundRpcHandler = new RPCHandler(backgroundRouter)

export default defineBackground(() => {
  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== BACKGROUND_ORPC_PORT_NAME) {
      return
    }

    backgroundRpcHandler.upgrade(port)
  })
})
