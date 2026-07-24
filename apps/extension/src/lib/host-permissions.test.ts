import { beforeEach, describe, expect, it, vi } from "vitest"

const permissionApi = vi.hoisted(() => ({
  getAll: vi.fn(),
  remove: vi.fn(),
}))

vi.mock("#imports", () => ({
  browser: {
    permissions: permissionApi,
  },
}))

const {
  getGrantedHostPermissionOrigins,
  getHostPermissionOrigins,
  getUserManagedHostPermissionOrigins,
  normalizeCapabilityHost,
  revokeHostPermissionOrigin,
} = await import("./host-permissions")

beforeEach(() => {
  permissionApi.getAll.mockReset()
  permissionApi.remove.mockReset()
})

describe("host permissions", () => {
  it("normalizes exact and wildcard capability hosts", () => {
    expect(normalizeCapabilityHost(" Example.COM ")).toBe("example.com")
    expect(normalizeCapabilityHost("*.Example.COM")).toBe("*.example.com")
    expect(normalizeCapabilityHost("*")).toBe("*")
  })

  it("rejects values that are not capability hosts", () => {
    expect(normalizeCapabilityHost("https://example.com")).toBeUndefined()
    expect(normalizeCapabilityHost("example.com/path")).toBeUndefined()
    expect(normalizeCapabilityHost("example.com:8080")).toBeUndefined()
    expect(normalizeCapabilityHost("")).toBeUndefined()
  })

  it("builds deduplicated precise origins from source capabilities", () => {
    expect(getHostPermissionOrigins({
      network: ["API.Example.com", "*.cdn.example.com", "https://invalid.example"],
      cookies: ["api.example.com"],
    })).toEqual([
      "*://api.example.com/*",
      "*://*.cdn.example.com/*",
    ])
  })

  it("lists granted host origins in stable order", async () => {
    permissionApi.getAll.mockResolvedValue({
      origins: ["*://b.example/*", "*://a.example/*", "*://b.example/*"],
    })

    await expect(getGrantedHostPermissionOrigins()).resolves.toEqual([
      "*://a.example/*",
      "*://b.example/*",
    ])
  })

  it("hides WXT localhost access only in development", () => {
    const origins = [
      "http://localhost/*",
      "*://source.example/*",
    ]

    expect(getUserManagedHostPermissionOrigins(origins, true)).toEqual([
      "*://source.example/*",
    ])
    expect(getUserManagedHostPermissionOrigins(origins, false)).toEqual(origins)
  })

  it("only revokes an origin that is currently granted", async () => {
    permissionApi.getAll.mockResolvedValue({
      origins: ["*://allowed.example/*"],
    })
    permissionApi.remove.mockResolvedValue(true)

    await expect(revokeHostPermissionOrigin("*://allowed.example/*")).resolves.toBe(true)
    await expect(revokeHostPermissionOrigin("*://other.example/*")).resolves.toBe(false)

    expect(permissionApi.remove).toHaveBeenCalledOnce()
    expect(permissionApi.remove).toHaveBeenCalledWith({
      origins: ["*://allowed.example/*"],
    })
  })
})
