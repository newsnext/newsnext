import type { SourceLoaderResult } from "../types"
import { describe, expect, it, vi } from "vitest"
import { renderSourceLoaderResult, validateSourceLoaderOutput } from "./loader-result"
import { compileSourceTemplate } from "./template"

describe("source loader result", () => {
  it("preserves valid loader results", () => {
    const result = {
      items: [{ title: "Example", url: "https://example.com" }],
      metadata: { badge: "https://example.com/avatar.png" },
    }

    expect(validateSourceLoaderOutput(result)).toEqual(result)
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
      inlineTemplate: "{{ scope.item.author.name }}",
    })).toThrowError("source loader output.inlineTemplate is not supported")
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
    })).toThrowError("items[0].content cannot contain both text and html")
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

  it("renders a compiled loader inline template", () => {
    const result = {
      items: [{ title: "Example", url: "https://example.com", stats: { likes: 0 } }],
    }
    const template = compileSourceTemplate("  {{ scope.item.stats.likes }} likes  ", {
      location: "example.inlineTemplate",
      slot: "inline",
    })
    expect(renderSourceLoaderResult(validateSourceLoaderOutput(result), template)).toEqual({
      items: result.items,
      inlinePresentation: ["0 likes"],
    })

    expect(() => compileSourceTemplate("{{ scope.params.secret }}", {
      location: "example.inlineTemplate",
      slot: "inline",
    })).toThrowError("expected one of: scope.item")
  })

  it("lets one item fall back when its presentation template cannot render", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const result = validateSourceLoaderOutput({
      items: [{ title: "Example", url: "https://example.com" }],
    })
    const template = compileSourceTemplate("{{ scope.item.author.name }}", {
      location: "example.inlineTemplate",
      slot: "inline",
    })
    expect(renderSourceLoaderResult(result, template)).toEqual({
      items: [{ title: "Example", url: "https://example.com" }],
      inlinePresentation: [""],
    })
    expect(consoleError).toHaveBeenCalledOnce()
    consoleError.mockRestore()
  })

  it("uses fallback presentation when a template renders empty text", () => {
    const result = validateSourceLoaderOutput({
      items: [{ title: "Example", url: "https://example.com" }],
    })
    const template = compileSourceTemplate("{% if scope.item.attributes %}label{% endif %}", {
      location: "example.inlineTemplate",
      slot: "inline",
    })

    expect(renderSourceLoaderResult(result, template)).toEqual({
      items: result.items,
      inlinePresentation: [""],
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
