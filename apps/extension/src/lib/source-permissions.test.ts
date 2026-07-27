import { describe, expect, it, vi } from "vitest"

vi.mock("#imports", () => ({
  browser: {
    permissions: {},
  },
}))

const {
  getPermissionRequestForSource,
  getSourcePermissionDescription,
} = await import("./source-permissions")

function createSource({
  browser = [],
  cookies = [],
  network = [],
  providerName = "Test",
  title,
}: {
  browser?: string[]
  cookies?: string[]
  network?: string[]
  providerName?: string
  title?: string
}) {
  return {
    capabilities: { browser, cookies, network },
    provider: {
      title: providerName,
    },
    title,
  }
}

describe("source permissions", () => {
  it("maps browser sources to all optional permissions they use", () => {
    expect(getPermissionRequestForSource(createSource({
      browser: ["history"],
      title: "History",
    }))).toEqual({
      permissions: ["history"],
    })
    expect(getPermissionRequestForSource(createSource({
      browser: ["bookmarks", "favicon"],
      title: "Bookmarks",
    }))).toEqual({
      permissions: ["bookmarks", "favicon"],
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
    expect(getSourcePermissionDescription(source))
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
