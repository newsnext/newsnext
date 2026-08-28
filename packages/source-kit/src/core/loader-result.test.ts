import { describe, expect, it } from "vitest"
import { validateSourceLoaderResult } from "./loader-result"

describe("source loader result", () => {
  it("preserves valid loader results", () => {
    const result = {
      items: [{ title: "Example", url: "https://example.com" }],
      metadata: { badge: "https://example.com/avatar.png" },
    }

    expect(validateSourceLoaderResult(result)).toEqual(result)
  })

  it("limits loader results to the first 50 items", () => {
    const items = Array.from({ length: 51 }, (_, index) => ({
      title: `Item ${index + 1}`,
      url: `https://example.com/${index + 1}`,
    }))

    expect(validateSourceLoaderResult({ items }).items).toEqual(items.slice(0, 50))
  })

  it("validates every item before limiting the result", () => {
    const items = Array.from({ length: 51 }, (_, index) => ({
      title: index === 50 ? "" : `Item ${index + 1}`,
      url: `https://example.com/${index + 1}`,
    }))

    expect(() => validateSourceLoaderResult({ items })).toThrowError(
      "items[50].title must be a non-empty string",
    )
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
      items: [{ title: "Example", url: "https://example.com", publishedAt: Number.NaN }],
    })).toThrowError("items[0].publishedAt must be a finite number")
  })

  it("rejects invalid semantic content", () => {
    expect(() => validateSourceLoaderResult({
      items: [{
        title: "Example",
        url: "https://example.com",
        content: { text: "Text", html: "<p>Text</p>" },
      }],
    })).toThrowError("items[0].content cannot contain both text and html")
  })

  it("rejects source-controlled picture presentation", () => {
    expect(() => validateSourceLoaderResult({
      items: [{
        title: "Example",
        url: "https://example.com",
        icon: { src: "https://example.com/avatar.png", radius: 999 },
      }],
    })).toThrowError("items[0].icon.radius is not supported")

    expect(() => validateSourceLoaderResult({
      items: [{
        title: "Example",
        url: "https://example.com",
        content: {
          pictures: [{ src: "https://example.com/picture.png", href: "https://example.com" }],
        },
      }],
    })).toThrowError("items[0].content.pictures[0] must be a non-empty string")
  })

  it("validates source-level item templates", () => {
    const result = {
      items: [{ title: "Example", url: "https://example.com", stats: { likes: 0 } }],
      itemTemplate: { inline: "{{ scope.item.stats.likes }} likes" },
    }
    expect(validateSourceLoaderResult(result)).toEqual(result)

    expect(() => validateSourceLoaderResult({
      ...result,
      itemTemplate: { inline: "{{ scope.params.secret }}" },
    })).toThrowError("expected one of: scope.item")
  })

  it("normalizes absent optional item fields after loading", () => {
    expect(validateSourceLoaderResult({
      items: [{
        title: "Example",
        url: "https://example.com",
        author: { name: undefined },
        stats: { likes: 0, comments: undefined, stars: 12 },
        attributes: { featured: false, topic: "" },
        icon: { kind: "author", src: undefined },
        content: { text: undefined, pictures: [] },
      }],
    })).toEqual({
      items: [{
        title: "Example",
        url: "https://example.com",
        stats: { likes: 0, stars: 12 },
        attributes: { featured: false },
      }],
    })
  })

  it("rejects invalid metadata", () => {
    expect(() => validateSourceLoaderResult({
      items: [{ title: "Example", url: "https://example.com" }],
      metadata: { title: "" },
    })).toThrowError("metadata.title must be a non-empty string")
  })
})
