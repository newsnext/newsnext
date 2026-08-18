import type { SourceLoaderResult } from "../types"
import { describe, expect, it } from "vitest"
import {
  parseSourceBaseUrl,
  resolveSourceLoaderResultUrls,
  resolveSourceMetadataUrls,
  resolveSourceUrl,
} from "./base-url"

describe("source base URL", () => {
  it("accepts absolute HTTP(S) URLs and rejects unsafe bases", () => {
    expect(parseSourceBaseUrl("https://example.com/news/", "test.baseUrl"))
      .toBe("https://example.com/news/")
    expect(() => parseSourceBaseUrl("/news", "test.baseUrl"))
      .toThrow("test.baseUrl must be an absolute HTTP(S) URL")
    expect(() => parseSourceBaseUrl("file:///news", "test.baseUrl"))
      .toThrow("test.baseUrl must be an absolute HTTP(S) URL without credentials")
    expect(() => parseSourceBaseUrl("https://user:secret@example.com", "test.baseUrl"))
      .toThrow("test.baseUrl must be an absolute HTTP(S) URL without credentials")
  })

  it("uses standard URL resolution semantics", () => {
    expect(resolveSourceUrl("items", "https://example.com/news/"))
      .toBe("https://example.com/news/items")
    expect(resolveSourceUrl("/items", "https://example.com/news/"))
      .toBe("https://example.com/items")
    expect(resolveSourceUrl("https://cdn.example.com/items", "https://example.com/"))
      .toBe("https://cdn.example.com/items")
    expect(resolveSourceUrl("/items", undefined)).toBe("/items")
  })

  it("resolves source and loader metadata URLs", () => {
    expect(resolveSourceMetadataUrls({
      badge: "/badge.png",
      home: "/latest",
      title: "Latest",
    }, "https://example.com/")).toEqual({
      badge: "https://example.com/badge.png",
      home: "https://example.com/latest",
      title: "Latest",
    })

    const output: SourceLoaderResult = {
      items: [],
      metadata: {
        badge: "/account.png",
        home: "/account",
        title: "Account",
      },
    }
    expect(resolveSourceLoaderResultUrls(output, "https://example.com/")).toEqual({
      items: [],
      metadata: {
        badge: "https://example.com/account.png",
        home: "https://example.com/account",
        title: "Account",
      },
    })
  })

  it("resolves every URL-bearing news item field", () => {
    const output = resolveSourceLoaderResultUrls({
      items: [{
        title: "Item",
        url: "/item",
        mobileUrl: "/mobile/item",
        author: {
          name: "Author",
          home: "/authors/author",
        },
        icon: { src: "/icon.png", kind: "author", label: "Author" },
        mark: { src: "/mark.png", kind: "trend", label: "Hot" },
        content: {
          text: "Preview",
          pictures: [
            "/preview.png",
            "/preview-2.png",
          ],
          iframe: {
            src: "/embed",
            title: "Embed",
          },
        },
      }],
    }, "https://example.com/")

    expect(output.items[0]).toMatchObject({
      url: "https://example.com/item",
      mobileUrl: "https://example.com/mobile/item",
      author: {
        home: "https://example.com/authors/author",
      },
      icon: { src: "https://example.com/icon.png" },
      mark: {
        src: "https://example.com/mark.png",
      },
      content: {
        pictures: [
          "https://example.com/preview.png",
          "https://example.com/preview-2.png",
        ],
        iframe: {
          src: "https://example.com/embed",
        },
      },
    })
  })
})
