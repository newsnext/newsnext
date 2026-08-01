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

  it("rejects invalid nested content and metadata", () => {
    expect(() => validateSourceLoaderResult({
      items: [{
        title: "Example",
        url: "https://example.com",
        preview: { text: "Text", html: "<p>Text</p>" } as never,
      }],
    })).toThrowError("items[0].preview must contain exactly one of text or html")

    expect(() => validateSourceLoaderResult({
      items: [{ title: "Example", url: "https://example.com" }],
      metadata: { title: "" },
    })).toThrowError("metadata.title must be a non-empty string")
  })
})
