import { RPCHandler } from "@orpc/server/message-port"
import { browser } from "wxt/browser"
import { defineBackground } from "#imports"
import { backgroundRouter } from "@/lib/background-orpc"
import { BACKGROUND_ORPC_PORT_NAME } from "@/lib/background-rpc-shared"

const backgroundRpcHandler = new RPCHandler(backgroundRouter)

interface SidePanelApi {
  setPanelBehavior?: (behavior: { openPanelOnActionClick: boolean }) => Promise<void>
}

export default defineBackground(() => {
  const sidePanel = (browser as typeof browser & { sidePanel?: SidePanelApi }).sidePanel

  void sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true }).catch((error: unknown) => {
    console.error("Failed to configure side panel behavior", error)
  })

  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== BACKGROUND_ORPC_PORT_NAME) {
      return
    }

    backgroundRpcHandler.upgrade(port)
  })
})
