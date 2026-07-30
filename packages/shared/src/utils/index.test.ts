import { describe, expect, it } from "vitest"
import { getFavicon } from "./index"

describe("getFavicon", () => {
  it("returns the favicon service URL for the original website", () => {
    expect(getFavicon("https://google.com/search?q=news"))
      .toBe("https://icons.folo.is/google.com")
  })

  it("uses the hostname when passed a URL", () => {
    expect(getFavicon(new URL("https://google.com:8443/search")))
      .toBe("https://icons.folo.is/google.com")
  })

  it("returns an empty string for invalid URLs", () => {
    expect(getFavicon("not-a-url")).toBe("")
  })

  it("resolves custom favicon template variables", () => {
    expect(getFavicon(
      "https://google.com/search?q=news",
      "https://www.google.com/s2/favicons?domain={hostname}&origin={origin}&url={url}",
    )).toBe(
      "https://www.google.com/s2/favicons?domain=google.com&origin=https%3A%2F%2Fgoogle.com&url=https%3A%2F%2Fgoogle.com%2Fsearch%3Fq%3Dnews",
    )
  })

  it("returns an empty string for an empty template", () => {
    expect(getFavicon("https://google.com", "")).toBe("")
  })
})
