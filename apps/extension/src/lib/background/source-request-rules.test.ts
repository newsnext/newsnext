import { beforeEach, describe, expect, it, vi } from "vitest"

const { browserMock } = vi.hoisted(() => ({
  browserMock: {
    declarativeNetRequest: {
      getSessionRules: vi.fn(),
      updateSessionRules: vi.fn(),
    },
    runtime: {
      id: "test-extension-id",
    },
  },
}))

vi.mock("#imports", () => ({
  browser: browserMock,
}))

const { syncSourceRequestRules } = await import("./source-request-rules")

const weiboRule = {
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
    requestDomains: ["weibo.com", "sinaimg.cn"],
    resourceTypes: ["image", "xmlhttprequest"],
  },
} satisfies import("@newsnext/source/types").SourceRequestRule

describe("source request rules", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    browserMock.declarativeNetRequest.getSessionRules.mockResolvedValue([
      { id: 42 },
      { id: 1_000_000_001 },
    ])
    browserMock.declarativeNetRequest.updateSessionRules.mockResolvedValue(undefined)
  })

  it("installs deduplicated extension-scoped session rules", async () => {
    await syncSourceRequestRules([weiboRule, weiboRule])

    expect(browserMock.declarativeNetRequest.updateSessionRules).toHaveBeenCalledWith({
      removeRuleIds: [1_000_000_001],
      addRules: [
        {
          id: 1_000_000_000,
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
            initiatorDomains: ["test-extension-id"],
            requestDomains: ["weibo.com", "sinaimg.cn"],
            resourceTypes: ["image", "xmlhttprequest"],
          },
        },
      ],
    })
  })

  it("exposes synchronization failures", async () => {
    const error = new Error("Invalid request rule")
    browserMock.declarativeNetRequest.updateSessionRules.mockRejectedValue(error)

    await expect(syncSourceRequestRules([weiboRule])).rejects.toBe(error)
  })
})
