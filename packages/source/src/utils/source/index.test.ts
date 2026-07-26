import type { SourceConfig } from "./index"
import { describe, expect, it } from "vitest"
import { resolveProvider } from "./index"

function createSourceConfig(radar: NonNullable<SourceConfig["radar"]>): SourceConfig {
  return {
    metadata: {
      title: "Test",
    },
    cache: "1h",
    radar,
    loader: {
      type: "json",
      url: "https://example.com/items",
      fields: {
        title: "title",
        url: "url",
      },
    },
  }
}

function resolveTestSource(config: SourceConfig): void {
  resolveProvider("test", {
    title: "Test",
    color: "blue",
    sources: { test: config },
  })
}

describe("source template contexts", () => {
  it("resolves source metadata from the metadata object", () => {
    const provider = resolveProvider("test", {
      title: "Provider",
      color: "blue",
      sources: {
        test: {
          metadata: {
            title: "Source",
            type: "timeline",
            home: "https://example.com/source",
          },
          cache: "1h",
          loader: {
            type: "rss",
            url: "https://example.com/feed.xml",
          },
        },
      },
    })

    expect(provider.sources.test).toMatchObject({
      title: "Source",
      type: "timeline",
      home: "https://example.com/source",
    })
  })

  it("restricts Radar parameter templates to URL variables", () => {
    expect(() => resolveTestSource(createSourceConfig([
      {
        id: "test",
        match: { hosts: ["example.com"] },
        patch: {
          params: {
            value: "{{ params.value }}",
          },
        },
      },
    ]))).toThrow("Template root \"params\" is not available")
  })

  it("allows parsed parameters and page data in Radar metadata templates", () => {
    expect(() => resolveTestSource(createSourceConfig([
      {
        id: "test",
        match: { hosts: ["example.com"] },
        patch: {
          params: {
            value: "{{ query.value | default: path.value }}",
          },
          metadata: {
            title: "{{ page.title | default: params.value }}",
          },
        },
      },
    ]))).not.toThrow()
  })

  it("does not expose source metadata to Radar templates", () => {
    expect(() => resolveTestSource(createSourceConfig([
      {
        id: "test",
        match: { hosts: ["example.com"] },
        patch: {
          metadata: {
            title: "{{ source.title }}",
          },
        },
      },
    ]))).toThrow("Template root \"source\" is not available")
  })
})
