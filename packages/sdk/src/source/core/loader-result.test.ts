import type { NewsItem, SourceLoaderResult } from "../../models/index.js"
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

  it("renders a compiled loader annotation template", async () => {
    const result = {
      items: [{ title: "Example", url: "https://example.com", stats: { likes: 0 } }],
    }
    const template = compileSourceTemplate("  {{ scope.item.stats.likes }} likes  ", {
      location: "example.annotation",
      slot: "annotation",
    })
    expect(await renderSourceLoaderResult(validateSourceLoaderOutput(result), template)).toEqual({
      items: result.items,
      annotations: ["0 likes"],
    })

    expect(() => compileSourceTemplate("{{ scope.params.secret }}", {
      location: "example.annotation",
      slot: "annotation",
    })).toThrowError("expected one of: scope.item")
  })

  it("formats normalized items without adding presentation fields to their data", async () => {
    const result = validateSourceLoaderOutput({ items: [
      { title: "First", url: "https://example.com/1", icon: { kind: "author", src: "" }, author: { name: "Author" } },
      { title: "Second", url: "https://example.com/2" },
    ] })
    const formatted = await renderSourceLoaderResult(result, item => item.icon ? undefined : item.author?.name)
    expect(formatted.annotations).toEqual(["Author", ""])
    expect(formatted.items).toBe(result.items)
    expect(formatted.items[0]).not.toHaveProperty("attributes")
    expect((await renderSourceLoaderResult(result, () => "  Label  ")).annotations).toEqual(["Label", "Label"])
  })

  it("keeps formatter failures isolated to the affected item", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      const result = validateSourceLoaderOutput({ items: [
        { title: "Broken", url: "https://example.com/1" },
        { title: "Working", url: "https://example.com/2" },
      ] })
      expect((await renderSourceLoaderResult(result, (item) => {
        if (item.title === "Broken") throw new Error("Invalid presentation")
        return item.title
      })).annotations).toEqual(["", "Working"])
      expect(consoleError).toHaveBeenCalledOnce()
    } finally {
      consoleError.mockRestore()
    }
  })

  it("awaits asynchronous annotation results in item order", async () => {
    const result = validateSourceLoaderOutput({ items: [
      { title: "First", url: "https://example.com/1" },
      { title: "Second", url: "https://example.com/2" },
    ] })
    expect((await renderSourceLoaderResult(result, async item => ` ${item.title} `)).annotations).toEqual(["First", "Second"])
  })

  it("formats a normalized batch once and trims its output", async () => {
    const result = validateSourceLoaderOutput({ items: [
      { title: "First", url: "https://example.com/1" },
      { title: "Second", url: "https://example.com/2" },
    ] })
    let calls = 0
    const formatter = Object.assign(() => {
      throw new Error("Unexpected per-item call")
    }, {
      formatItems: async (items: readonly NewsItem[]) => {
        calls += 1
        return items.map(item => ` ${item.title} `)
      },
    })
    expect((await renderSourceLoaderResult(result, formatter)).annotations).toEqual(["First", "Second"])
    expect(calls).toBe(1)
  })

  it("preserves annotation text when optional item information is missing", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const result = validateSourceLoaderOutput({
      items: [{ title: "Example", url: "https://example.com" }],
    })
    const template = compileSourceTemplate("By {{ scope.item.author.name }} · News", {
      location: "example.annotation",
      slot: "annotation",
    })
    expect(await renderSourceLoaderResult(result, template)).toEqual({
      items: [{ title: "Example", url: "https://example.com" }],
      annotations: ["By  · News"],
    })
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it("renders empty annotation text for a missing value", async () => {
    const result = validateSourceLoaderOutput({
      items: [{ title: "Example", url: "https://example.com" }],
    })
    const template = compileSourceTemplate("{{ scope.item.attributes.label }}", {
      location: "example.annotation",
      slot: "annotation",
    })

    expect(await renderSourceLoaderResult(result, template)).toEqual({
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

  it("accepts omitted optional metadata values from custom loaders", () => {
    const result = {
      items: [{ title: "Example", url: "https://example.com" }],
      metadata: { title: "Example", type: undefined, badge: undefined, home: undefined },
    }
    expect(validateSourceLoaderOutput(result)).toEqual(result)
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
