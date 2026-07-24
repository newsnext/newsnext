import { beforeEach, describe, expect, it, vi } from "vitest"

const permissionApi = vi.hoisted(() => ({
  contains: vi.fn(),
  request: vi.fn(),
}))

vi.mock("@wxt-dev/browser", () => ({
  browser: {
    permissions: permissionApi,
  },
}))

const {
  getOptionalPermissionForSource,
  hasPermissionToLoadSource,
  requestPermissionToLoadSource,
} = await import("./source-permissions")

beforeEach(() => {
  permissionApi.contains.mockReset()
  permissionApi.request.mockReset()
})

describe("getOptionalPermissionForSource", () => {
  it("maps browser sources to their optional permissions", () => {
    expect(getOptionalPermissionForSource("browser:history")).toBe("history")
    expect(getOptionalPermissionForSource("browser:bookmarks")).toBe("bookmarks")
  })

  it("does not require a permission for other sources", () => {
    expect(getOptionalPermissionForSource("hackernews:top")).toBeUndefined()
  })

  it("checks and requests the matching browser permission", async () => {
    permissionApi.contains.mockResolvedValue(false)
    permissionApi.request.mockResolvedValue(true)

    await expect(hasPermissionToLoadSource("browser:history")).resolves.toBe(false)
    await expect(requestPermissionToLoadSource("browser:history")).resolves.toBe(true)

    expect(permissionApi.contains).toHaveBeenCalledWith({ permissions: ["history"] })
    expect(permissionApi.request).toHaveBeenCalledWith({ permissions: ["history"] })
  })

  it("loads regular sources without using the permissions API", async () => {
    await expect(hasPermissionToLoadSource("hackernews:top")).resolves.toBe(true)
    await expect(requestPermissionToLoadSource("hackernews:top")).resolves.toBe(true)

    expect(permissionApi.contains).not.toHaveBeenCalled()
    expect(permissionApi.request).not.toHaveBeenCalled()
  })
})
