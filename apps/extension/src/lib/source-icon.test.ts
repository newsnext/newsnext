import { describe, expect, it } from "vitest"
import { resolveSourceIcon, SOURCE_ICON_PRESETS } from "./source-icon"

describe("resolveSourceIcon", () => {
  it("preserves an explicit provider icon", () => {
    expect(resolveSourceIcon(
      "data:image/svg+xml,icon",
      "https://google.com/search",
    )).toBe("data:image/svg+xml,icon")
  })

  it("derives a favicon URL from the source home", () => {
    expect(resolveSourceIcon(undefined, "https://google.com/search"))
      .toBe("https://favicon.im/google.com?larger=true")
  })

  it.each([
    ["Google", SOURCE_ICON_PRESETS.google.template, "https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https%3A%2F%2Fgoogle.com&size=128"],
    ["Vemetric", SOURCE_ICON_PRESETS.vemetric.template, "https://favicon.vemetric.com/google.com?size=128&format=webp"],
    ["DuckDuckGo", SOURCE_ICON_PRESETS.duckDuckGo.template, "https://icons.duckduckgo.com/ip3/google.com.ico"],
  ])("resolves the %s preset", (_, template, expected) => {
    expect(resolveSourceIcon(undefined, "https://google.com/search", template))
      .toBe(expected)
  })

  it("allows automatic icons to be disabled with an empty template", () => {
    expect(resolveSourceIcon(undefined, "https://google.com", "")).toBeUndefined()
  })

  it("leaves the icon unset when neither value is usable", () => {
    expect(resolveSourceIcon(undefined, undefined)).toBeUndefined()
    expect(resolveSourceIcon(undefined, "not-a-url")).toBeUndefined()
  })
})
