import { RPCHandler } from "@orpc/server/message-port"
import { browser } from "wxt/browser"
import { defineBackground } from "#imports"
import { backgroundRouter } from "@/lib/background-orpc"
import { BACKGROUND_ORPC_PORT_NAME } from "@/lib/background-rpc-shared"

const COOLAPK_USER_AGENT_RULE_ID = 1
const COOLAPK_USER_AGENT = "Dalvik/2.1.0 (Linux; U; Android 10; Redmi K30 5G MIUI/V12.0.3.0.QGICMXM) (#Build; Redmi; Redmi K30 5G; QKQ1.191222.002 test-keys; 10) +CoolMarket/11.0-2101202"

const backgroundRpcHandler = new RPCHandler(backgroundRouter)

async function installCoolApkUserAgentRule(): Promise<void> {
  if (!browser.declarativeNetRequest?.updateSessionRules) {
    return
  }

  await browser.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [COOLAPK_USER_AGENT_RULE_ID],
    addRules: [
      {
        id: COOLAPK_USER_AGENT_RULE_ID,
        priority: 1,
        action: {
          type: "modifyHeaders",
          requestHeaders: [
            {
              header: "User-Agent",
              operation: "set",
              value: COOLAPK_USER_AGENT,
            },
          ],
        },
        condition: {
          requestDomains: ["api.coolapk.com"],
          resourceTypes: ["xmlhttprequest", "other"],
        },
      },
    ],
  })
}

export default defineBackground(() => {
  void installCoolApkUserAgentRule().catch((error) => {
    console.error("Failed to install CoolAPK request headers", error)
  })

  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== BACKGROUND_ORPC_PORT_NAME) {
      return
    }

    backgroundRpcHandler.upgrade(port)
  })
})
