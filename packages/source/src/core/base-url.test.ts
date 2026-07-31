import type { SourceLoaderOutput } from "../types"
import { describe, expect, it } from "vitest"
import {
  parseSourceBaseUrl,
  resolveSourceLoaderOutputUrls,
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

    const output: SourceLoaderOutput = {
      items: [],
      metadata: {
        badge: "/account.png",
        home: "/account",
        title: "Account",
      },
    }
    expect(resolveSourceLoaderOutputUrls(output, "https://example.com/")).toEqual({
      items: [],
      metadata: {
        badge: "https://example.com/account.png",
        home: "https://example.com/account",
        title: "Account",
      },
    })
  })

  it("resolves every URL-bearing news item field", () => {
    const output = resolveSourceLoaderOutputUrls([{
      title: "Item",
      url: "/item",
      mobileUrl: "/mobile/item",
      inline: {
        icon: "/icon.png",
        mark: [
          "Featured",
          { src: "/mark.png", href: "/marks" },
        ],
      },
      preview: {
        text: "Preview",
        picture: [
          "/preview.png",
          { src: "/preview-2.png", href: "/gallery" },
        ],
        iframe: {
          src: "/embed",
          title: "Embed",
        },
      },
    }], "https://example.com/")
    expect(Array.isArray(output)).toBe(true)
    if (!Array.isArray(output)) {
      throw new TypeError("Expected an item array")
    }

    expect(output[0]).toMatchObject({
      url: "https://example.com/item",
      mobileUrl: "https://example.com/mobile/item",
      inline: {
        icon: "https://example.com/icon.png",
        mark: [
          "Featured",
          {
            src: "https://example.com/mark.png",
            href: "https://example.com/marks",
          },
        ],
      },
      preview: {
        picture: [
          "https://example.com/preview.png",
          {
            src: "https://example.com/preview-2.png",
            href: "https://example.com/gallery",
          },
        ],
        iframe: {
          src: "https://example.com/embed",
        },
      },
    })
  })
})
