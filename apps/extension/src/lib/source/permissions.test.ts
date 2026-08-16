import { describe, expect, it, vi } from "vitest"

vi.mock("#imports", () => ({
  browser: {
    permissions: {},
  },
}))

const {
  getPermissionRequestForSource,
  getSourcePermissionDescription,
} = await import("./permissions")

function createSource({
  cookies = [],
  network = [],
  providerName = "Test",
  sourceId = "test:source",
}: {
  cookies?: string[]
  network?: string[]
  providerName?: string
  sourceId?: string
}) {
  return {
    capabilities: { cookies, network },
    provider: {
      title: providerName,
    },
    sourceId,
  }
}

describe("source permissions", () => {
  it("maps RSS feeds to the configured feed origin", () => {
    const source = {
      ...createSource({
        network: ["*"],
        providerName: "RSS",
        sourceId: "rss:feed",
      }),
      params: {
        url: {
          type: "url" as const,
          title: "Feed URL",
          default: "https://default.example.com/feed.xml",
        },
      },
    }

    expect(getPermissionRequestForSource(source)).toEqual({
      origins: ["*://default.example.com/*"],
    })
    expect(getPermissionRequestForSource(source, {
      url: "https://feeds.example.org/news.xml",
    })).toEqual({
      origins: ["*://feeds.example.org/*"],
    })
  })

  it("maps runtime-added network sources to a narrow optional origin", () => {
    const source = createSource({
      network: ["user-added.example.com"],
      providerName: "User source",
    })

    expect(getPermissionRequestForSource(source)).toEqual({
      origins: ["*://user-added.example.com/*"],
    })
    expect(getSourcePermissionDescription(
      source,
      getPermissionRequestForSource(source),
    ))
      .toBe("Authorize access to user-added.example.com to load this source.")
  })

  it("deduplicates network and cookie origins", () => {
    expect(getPermissionRequestForSource(createSource({
      cookies: ["account.example.com"],
      network: ["account.example.com"],
    }))).toEqual({
      permissions: ["cookies"],
      origins: ["*://account.example.com/*"],
    })
  })

  it("does not require permissions for sources without capabilities", () => {
    expect(getPermissionRequestForSource(createSource({}))).toBeUndefined()
  })
})
