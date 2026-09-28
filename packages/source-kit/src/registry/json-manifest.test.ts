import { describe, expect, it } from "vitest"
import { validateJsonSourceManifest } from "./json-manifest"

const provider = {
  title: "Example",
  color: "slate",
  sources: {
    feed: {
      loader: { type: "rss", url: "https://example.com/feed" },
      params: {
        limit: { type: "number", title: "Limit", default: 10 },
      },
    },
  },
}

describe("validateJsonSourceManifest", () => {
  it("accepts a valid provider manifest", () => {
    expect(() => validateJsonSourceManifest(provider, "provider.json")).not.toThrow()
  })

  it("rejects missing loaders and invalid parameter definitions", () => {
    expect(() => validateJsonSourceManifest({ title: "Example", color: "slate", sources: { feed: {} } }, "provider.json"))
      .toThrow("provider.json")
    expect(() => validateJsonSourceManifest({
      ...provider,
      sources: {
        feed: {
          ...provider.sources.feed,
          params: { limit: { type: "number", title: "Limit", default: "ten" } },
        },
      },
    }, "provider.json")).toThrow("provider.json.sources.feed.params")
  })
})
