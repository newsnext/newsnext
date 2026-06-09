import { describe, expect, it } from "vitest"
import { resolveBaseURL } from "./env"

describe("resolveBaseURL", () => {
  it("uses the configured base URL without a trailing slash", () => {
    expect(resolveBaseURL("https://api.newsnext.pro/", true)).toBe("https://api.newsnext.pro")
  })

  it("uses the local API server in development when no base URL is configured", () => {
    expect(resolveBaseURL("", true)).toBe("http://localhost:4000")
  })

  it("falls back to same-origin URLs in production when no base URL is configured", () => {
    expect(resolveBaseURL("", false)).toBe("")
  })
})
