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

vi.mock("wxt/browser", () => ({
  browser: browserMock,
}))

const { installImageRequestRules } = await import("./image-request-rules")

describe("image request rules", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    browserMock.declarativeNetRequest.updateSessionRules.mockResolvedValue(undefined)
  })

  it("installs an extension-scoped Weibo referer rule", async () => {
    await installImageRequestRules()

    expect(browserMock.declarativeNetRequest.updateSessionRules).toHaveBeenCalledWith({
      removeRuleIds: [expect.any(Number)],
      addRules: [
        expect.objectContaining({
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
            initiatorDomains: ["test-extension-id"],
            requestDomains: ["sinaimg.cn"],
            resourceTypes: ["image", "xmlhttprequest"],
          },
        }),
      ],
    })
  })
})
