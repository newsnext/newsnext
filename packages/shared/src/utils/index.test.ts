import { describe, expect, it } from "vitest"
import { getFavicon } from "./index"

describe("getFavicon", () => {
  it("returns the favicon service URL for the original website", () => {
    expect(getFavicon("https://example.com/news/latest?lang=en"))
      .toBe("https://icons.folo.is/example.com")
  })

  it("uses the hostname when passed a URL", () => {
    expect(getFavicon(new URL("https://example.com:8443/path")))
      .toBe("https://icons.folo.is/example.com")
  })

  it("returns an empty string for invalid URLs", () => {
    expect(getFavicon("not-a-url")).toBe("")
  })
})
