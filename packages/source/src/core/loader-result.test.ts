import { describe, expect, it } from "vitest"
import { validateSourceLoaderResult } from "./loader-result"

describe("source loader result", () => {
  it("preserves valid loader results", () => {
    const result = {
      items: [{ title: "Example", url: "https://example.com" }],
      metadata: { badge: "https://example.com/avatar.png" },
    }

    expect(validateSourceLoaderResult(result)).toBe(result)
  })

  it("rejects empty loader results", () => {
    expect(() => validateSourceLoaderResult({ items: [] })).toThrowError(
      "Invalid source loader result: No source items. Refresh to try again.",
    )
  })

  it("rejects invalid news items", () => {
    expect(() => validateSourceLoaderResult({
      items: [{ title: "", url: "https://example.com" }],
    })).toThrowError("items[0].title must be a non-empty string")

    expect(() => validateSourceLoaderResult({
      items: [{ title: "Example", url: "https://example.com", timestamp: Number.NaN }],
    })).toThrowError("items[0].timestamp must be a finite number")
  })

  it("omits invalid inline and preview content without rejecting the item", () => {
    const result = validateSourceLoaderResult({
      items: [{
        title: "Example",
        url: "https://example.com",
        inline: {},
        preview: { text: "Text", html: "<p>Text</p>" } as never,
      }],
    })

    expect(result.items).toEqual([{
      title: "Example",
      url: "https://example.com",
    }])
  })

  it("rejects invalid metadata", () => {
    expect(() => validateSourceLoaderResult({
      items: [{ title: "Example", url: "https://example.com" }],
      metadata: { title: "" },
    })).toThrowError("metadata.title must be a non-empty string")
  })
})
