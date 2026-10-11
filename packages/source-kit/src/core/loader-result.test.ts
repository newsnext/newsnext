import type { SourceLoaderResult } from "../types"
import { describe, expect, it, vi } from "vitest"
import { renderSourceLoaderResult, validateSourceLoaderOutput } from "./loader-result"
import { compileSourceTemplate } from "./template"

describe("source loader result", () => {
  it("rejects color in loader metadata", () => {
    expect(() => validateSourceLoaderOutput({
      items: [{ title: "Item", url: "https://example.com" }],
      metadata: { color: "teal" },
    } as unknown as SourceLoaderResult)).toThrow("metadata.color is not supported")
  })

  it("preserves valid loader results", () => {
    const result = {
      items: [{ title: "Example", url: "https://example.com" }],
      metadata: { badge: "https://example.com/avatar.png" },
    }

    expect(validateSourceLoaderOutput(result)).toEqual(result)
  })

  it.each([
    ["updatedAt", 1000],
    ["mobileUrl", "https://m.example.com/item"],
  ])("rejects removed item field %s at the loader boundary", (field, value) => {
    expect(() => validateSourceLoaderOutput({
      items: [{ title: "Example", url: "https://example.com", [field]: value }],
    })).toThrowError(`items[0].${field} is not supported`)
  })

  it.each([
    "https://example.com/embed",
    { src: "https://example.com/embed" },
  ])("rejects removed iframe content at the loader boundary", (iframe) => {
    expect(() => validateSourceLoaderOutput({
      items: [{
        title: "Example",
        url: "https://example.com",
        content: { text: "Preview", iframe },
      }],
    })).toThrowError("items[0].content.iframe is not supported")
  })

  it("limits loader results to the first 50 items", () => {
    const items = Array.from({ length: 51 }, (_, index) => ({
      title: `Item ${index + 1}`,
      url: `https://example.com/${index + 1}`,
    }))

    expect(validateSourceLoaderOutput({ items }).items).toEqual(items.slice(0, 50))
  })

  it("validates every item before limiting the result", () => {
    const items = Array.from({ length: 51 }, (_, index) => ({
      title: index === 50 ? "" : `Item ${index + 1}`,
      url: `https://example.com/${index + 1}`,
    }))

    expect(() => validateSourceLoaderOutput({ items })).toThrowError(
      "items[50].title must be a non-empty string",
    )
  })

  it("rejects empty loader results", () => {
    expect(() => validateSourceLoaderOutput({ items: [] })).toThrowError(
      "Invalid source loader result: No source items. Refresh to try again.",
    )
  })

  it("rejects loader configuration in execution output", () => {
    expect(() => validateSourceLoaderOutput({
      items: [{ title: "Example", url: "https://example.com" }],
      annotation: "{{ scope.item.author.name }}",
    })).toThrowError("source loader output.annotation is not supported")
  })

  it("rejects invalid news items", () => {
    expect(() => validateSourceLoaderOutput({
      items: [{ title: "", url: "https://example.com" }],
    })).toThrowError("items[0].title must be a non-empty string")

    expect(() => validateSourceLoaderOutput({
      items: [{ title: "Example", url: "https://example.com", publishedAt: Number.NaN }],
    })).toThrowError("items[0].publishedAt must be a finite number")
  })

  it("rejects invalid semantic content", () => {
    expect(() => validateSourceLoaderOutput({
      items: [{
        title: "Example",
        url: "https://example.com",
        content: { text: "Text", html: "<p>Text</p>" },
      }],
    })).toThrowError("content must contain only one of markdown, text, or html")
  })

  it("rejects source-controlled picture presentation", () => {
    expect(() => validateSourceLoaderOutput({
      items: [{
        title: "Example",
        url: "https://example.com",
        icon: { src: "https://example.com/avatar.png", radius: 999 },
      }],
    })).toThrowError("items[0].icon.radius is not supported")

    expect(() => validateSourceLoaderOutput({
      items: [{
        title: "Example",
        url: "https://example.com",
        content: {
          pictures: [{ src: "https://example.com/picture.png", href: "https://example.com" }],
        },
      }],
    })).toThrowError("items[0].content.pictures[0] must be a non-empty string")
  })

  it("renders a compiled loader annotation template", () => {
    const result = {
      items: [{ title: "Example", url: "https://example.com", stats: { likes: 0 } }],
    }
    const template = compileSourceTemplate("  {{ scope.item.stats.likes }} likes  ", {
      location: "example.annotation",
      slot: "annotation",
    })
    expect(renderSourceLoaderResult(validateSourceLoaderOutput(result), template)).toEqual({
      items: result.items,
      annotations: ["0 likes"],
    })

    expect(() => compileSourceTemplate("{{ scope.params.secret }}", {
      location: "example.annotation",
      slot: "annotation",
    })).toThrowError("expected one of: scope.item")
  })

  it("formats normalized items without adding presentation fields to their data", () => {
    const result = validateSourceLoaderOutput({ items: [
      { title: "First", url: "https://example.com/1", icon: { kind: "author", src: "" }, author: { name: "Author" } },
      { title: "Second", url: "https://example.com/2" },
    ] })
    const formatted = renderSourceLoaderResult(result, item => item.icon ? undefined : item.author?.name)
    expect(formatted.annotations).toEqual(["Author", ""])
    expect(formatted.items).toBe(result.items)
    expect(formatted.items[0]).not.toHaveProperty("attributes")
    expect(renderSourceLoaderResult(result, () => "  Label  ").annotations).toEqual(["Label", "Label"])
  })

  it("keeps formatter failures isolated to the affected item", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      const result = validateSourceLoaderOutput({ items: [
        { title: "Broken", url: "https://example.com/1" },
        { title: "Working", url: "https://example.com/2" },
      ] })
      expect(renderSourceLoaderResult(result, (item) => {
        if (item.title === "Broken") throw new Error("Invalid presentation")
        return item.title
      }).annotations).toEqual(["", "Working"])
      expect(consoleError).toHaveBeenCalledOnce()
    } finally {
      consoleError.mockRestore()
    }
  })

  it("omits an annotation when optional item information is missing", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const result = validateSourceLoaderOutput({
      items: [{ title: "Example", url: "https://example.com" }],
    })
    const template = compileSourceTemplate("By {{ scope.item.author.name }} · News", {
      location: "example.annotation",
      slot: "annotation",
    })
    expect(renderSourceLoaderResult(result, template)).toEqual({
      items: [{ title: "Example", url: "https://example.com" }],
      annotations: [""],
    })
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it("uses fallback presentation when a template renders empty text", () => {
    const result = validateSourceLoaderOutput({
      items: [{ title: "Example", url: "https://example.com" }],
    })
    const template = compileSourceTemplate("{{ scope.item.attributes.label ?? '' }}", {
      location: "example.annotation",
      slot: "annotation",
    })

    expect(renderSourceLoaderResult(result, template)).toEqual({
      items: result.items,
      annotations: [""],
    })
  })

  it("normalizes absent optional item fields after loading", () => {
    expect(validateSourceLoaderOutput({
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
    expect(() => validateSourceLoaderOutput({
      items: [{ title: "Example", url: "https://example.com" }],
      metadata: { title: "" },
    })).toThrowError("metadata.title must be a non-empty string")

    expect(() => validateSourceLoaderOutput({
      items: [{ title: "Example", url: "https://example.com" }],
      metadata: { type: "timeline" },
    } as unknown as SourceLoaderResult)).toThrowError(
      "metadata.type must be \"list\" or \"ranking\"",
    )
  })
})
