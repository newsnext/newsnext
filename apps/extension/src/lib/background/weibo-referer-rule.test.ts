import { beforeEach, describe, expect, it, vi } from "vitest"

const { browserMock } = vi.hoisted(() => ({
  browserMock: {
    declarativeNetRequest: {
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

const { installWeiboRefererRule } = await import("./weibo-referer-rule")

describe("weibo referer rule", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    browserMock.declarativeNetRequest.updateSessionRules.mockResolvedValue(undefined)
  })

  it("installs an extension-scoped Weibo referer rule", async () => {
    await installWeiboRefererRule()

    expect(browserMock.declarativeNetRequest.updateSessionRules).toHaveBeenCalledWith({
      removeRuleIds: [expect.any(Number), expect.any(Number), expect.any(Number)],
      addRules: [
        expect.objectContaining({
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
            requestDomains: ["sinaimg.cn", "weibo.com", "s.weibo.com", "m.weibo.cn"],
            resourceTypes: ["image", "xmlhttprequest"],
          },
        }),
      ],
    })
  })

  it("exposes rule installation failures", async () => {
    const error = new Error("Invalid request rule")
    browserMock.declarativeNetRequest.updateSessionRules.mockRejectedValue(error)

    await expect(installWeiboRefererRule()).rejects.toBe(error)
  })
})
