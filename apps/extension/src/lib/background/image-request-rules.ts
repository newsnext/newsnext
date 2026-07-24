import { browser } from "#imports"

const IMAGE_REQUEST_RULE_ID = 1_000_000_001

export async function installImageRequestRules(): Promise<void> {
  const declarativeNetRequest = browser.declarativeNetRequest
  if (!declarativeNetRequest?.updateSessionRules) {
    return
  }

  await declarativeNetRequest.updateSessionRules({
    removeRuleIds: [IMAGE_REQUEST_RULE_ID],
    addRules: [
      {
        id: IMAGE_REQUEST_RULE_ID,
        priority: 1,
        action: {
          type: "modifyHeaders",
          requestHeaders: [
            {
              header: "Referer",
              operation: "set",
              value: "https://m.weibo.cn/",
            },
          ],
        },
        condition: {
          initiatorDomains: [browser.runtime.id],
          requestDomains: ["sinaimg.cn"],
          resourceTypes: ["image", "xmlhttprequest"],
        },
      },
    ],
  }).catch(() => undefined)
}
