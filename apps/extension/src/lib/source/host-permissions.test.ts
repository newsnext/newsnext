import { describe, expect, it, vi } from "vitest"

vi.mock("#imports", () => ({
  browser: {
    permissions: {},
  },
}))

const {
  getHostPermissionOrigins,
  getUserManagedHostPermissionOrigins,
  normalizeCapabilityHost,
} = await import("./host-permissions")

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
})
