import { browser } from "#imports"

const WEIBO_REFERER_RULE_ID = 1_000_000_001
const OBSOLETE_WEIBO_RULE_IDS = [1_000_000_002, 1_000_000_003]

export async function installWeiboRefererRule(): Promise<void> {
  const declarativeNetRequest = browser.declarativeNetRequest
  if (!declarativeNetRequest?.updateSessionRules) {
    return
  }

  await declarativeNetRequest.updateSessionRules({
    removeRuleIds: [
      WEIBO_REFERER_RULE_ID,
      ...OBSOLETE_WEIBO_RULE_IDS,
    ],
    addRules: [
      {
        id: WEIBO_REFERER_RULE_ID,
        priority: 1,
        action: {
          type: "modifyHeaders",
          requestHeaders: [
            {
              header: "Referer",
              operation: "set",
              value: "https://weibo.com/",
            },
          ],
        },
        condition: {
          initiatorDomains: [browser.runtime.id],
          requestDomains: ["sinaimg.cn", "weibo.com", "s.weibo.com", "m.weibo.cn"],
          resourceTypes: ["image", "xmlhttprequest"],
        },
      },
    ],
  })
}
