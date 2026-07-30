import { describe, expect, it } from "vitest"
import { resolveSourceIcon } from "./source-icon"

describe("resolveSourceIcon", () => {
  it("preserves an explicit provider icon", () => {
    expect(resolveSourceIcon(
      "data:image/svg+xml,icon",
      "https://google.com/search",
    )).toBe("data:image/svg+xml,icon")
  })

  it("derives a favicon URL from the source home", () => {
    expect(resolveSourceIcon(undefined, "https://google.com/search"))
      .toBe("https://icons.folo.is/google.com")
  })

  it("allows automatic icons to be disabled with an empty template", () => {
    expect(resolveSourceIcon(undefined, "https://google.com", "")).toBeUndefined()
  })

  it("leaves the icon unset when neither value is usable", () => {
    expect(resolveSourceIcon(undefined, undefined)).toBeUndefined()
    expect(resolveSourceIcon(undefined, "not-a-url")).toBeUndefined()
  })
})
