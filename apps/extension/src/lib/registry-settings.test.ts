import { describe, expect, it, vi } from "vitest"

vi.mock("#imports", () => ({
  browser: {
    permissions: {},
    storage: { local: {} },
  },
}))

const { normalizeRegistryUrls } = await import("./registry-settings")

describe("normalizeRegistryUrls", () => {
  it("normalizes unique HTTPS registry URLs", () => {
    expect(normalizeRegistryUrls([
      " https://example.com/registry.json#latest ",
      "https://example.com/registry.json",
      "http://example.com/registry.json",
      "invalid",
    ])).toEqual(["https://example.com/registry.json"])
  })
})
