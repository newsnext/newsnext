import { describe, expect, it } from "vitest"
import { resolveSourceIconUrl } from "./source-icon"

describe("resolveSourceIconUrl", () => {
  it("resolves parameterized source icon URLs", () => {
    expect(resolveSourceIconUrl(
      "https://t.me/i/userpic/320/{{ params.channel | required | url_path }}.jpg",
      { channel: "Test Flight" },
    )).toBe("https://t.me/i/userpic/320/Test%20Flight.jpg")
  })

  it("returns undefined when a required parameter is missing", () => {
    expect(resolveSourceIconUrl(
      "https://example.com/{{ params.channel | required | url_path }}.png",
      {},
    )).toBeUndefined()
  })

  it("preserves source icon URLs without parameters", () => {
    expect(resolveSourceIconUrl(
      "https://example.com/icon.png",
      {},
    )).toBe("https://example.com/icon.png")
  })
})
