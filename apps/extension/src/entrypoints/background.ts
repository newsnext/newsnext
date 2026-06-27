import type { NewsItem } from "@newsnext/sources/typings"
import { prepareSourceRequest } from "@newsnext/sources/service"
import { browser } from "wxt/browser"
import { defineBackground } from "#imports"

const COOLAPK_USER_AGENT_RULE_ID = 1
const COOLAPK_USER_AGENT = "Dalvik/2.1.0 (Linux; U; Android 10; Redmi K30 5G MIUI/V12.0.3.0.QGICMXM) (#Build; Redmi; Redmi K30 5G; QKQ1.191222.002 test-keys; 10) +CoolMarket/11.0-2101202"

interface LoadSourceMessage {
  type: "load-source"
  sourceId: string
  params?: Record<string, unknown>
}

interface LoadSourceSuccess {
  ok: true
  items: NewsItem[]
  key?: string
  updated: number
}

interface LoadSourceFailure {
  ok: false
  error: string
}

export type LoadSourceResponse = LoadSourceSuccess | LoadSourceFailure

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return "Failed to load this source"
}

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

async function loadSourceItems(
  sourceId: string,
  params: Record<string, unknown> = {},
): Promise<Omit<LoadSourceSuccess, "ok">> {
  const request = prepareSourceRequest(sourceId, params)
  const items = await request.source.loader(request.params)

  return {
    items,
    updated: Date.now(),
  }
}

function isLoadSourceMessage(message: unknown): message is LoadSourceMessage {
  if (!message || typeof message !== "object") {
    return false
  }

  const value = message as Partial<LoadSourceMessage>
  return value.type === "load-source" && typeof value.sourceId === "string"
}

export default defineBackground(() => {
  void installCoolApkUserAgentRule().catch((error) => {
    console.error("Failed to install CoolAPK request headers", error)
  })

  browser.runtime.onMessage.addListener((message: unknown) => {
    if (!isLoadSourceMessage(message)) {
      return undefined
    }

    return loadSourceItems(message.sourceId, message.params)
      .then<LoadSourceResponse>(result => ({ ok: true, ...result }))
      .catch<LoadSourceResponse>(error => ({ ok: false, error: getErrorMessage(error) }))
  })
})
