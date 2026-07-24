import { beforeEach, describe, expect, it, vi } from "vitest"

const permissionApi = vi.hoisted(() => ({
  contains: vi.fn(),
  request: vi.fn(),
}))

vi.mock("#imports", () => ({
  browser: {
    permissions: permissionApi,
  },
}))

const {
  getPermissionRequestForSource,
  getSourcePermissionDescription,
  hasPermissionToLoadSource,
  requestPermissionToLoadSource,
} = await import("./source-permissions")

function createSource({
  browser = [],
  cookies = [],
  network = [],
  providerTitle = "Test",
  title,
}: {
  browser?: string[]
  cookies?: string[]
  network?: string[]
  providerTitle?: string
  title?: string
}) {
  return {
    capabilities: { browser, cookies, network },
    providerTitle,
    title,
  }
}

beforeEach(() => {
  permissionApi.contains.mockReset()
  permissionApi.request.mockReset()
})

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
      providerTitle: "User source",
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

  it("checks and requests the matching browser permission", async () => {
    const source = createSource({ browser: ["history"], title: "History" })
    permissionApi.contains.mockResolvedValue(false)
    permissionApi.request.mockResolvedValue(true)

    await expect(hasPermissionToLoadSource(source)).resolves.toBe(false)
    await expect(requestPermissionToLoadSource(source)).resolves.toBe(true)

    expect(permissionApi.contains).toHaveBeenCalledWith({ permissions: ["history"] })
    expect(permissionApi.request).toHaveBeenCalledWith({ permissions: ["history"] })
  })

  it("checks and requests the matching source origin", async () => {
    const source = createSource({ network: ["news.ycombinator.com"] })
    permissionApi.contains.mockResolvedValue(false)
    permissionApi.request.mockResolvedValue(true)

    await expect(hasPermissionToLoadSource(source)).resolves.toBe(false)
    await expect(requestPermissionToLoadSource(source)).resolves.toBe(true)

    const request = { origins: ["*://news.ycombinator.com/*"] }
    expect(permissionApi.contains).toHaveBeenCalledWith(request)
    expect(permissionApi.request).toHaveBeenCalledWith(request)
  })

  it("loads sources without capabilities without using the permissions API", async () => {
    const source = createSource({})

    await expect(hasPermissionToLoadSource(source)).resolves.toBe(true)
    await expect(requestPermissionToLoadSource(source)).resolves.toBe(true)

    expect(permissionApi.contains).not.toHaveBeenCalled()
    expect(permissionApi.request).not.toHaveBeenCalled()
  })
})
