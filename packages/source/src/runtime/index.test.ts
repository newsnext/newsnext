import type { RuntimeSource } from "@newsnext/source/types"
import { describe, expect, it } from "vitest"
import {
  normalizeSourceLoaderResult,
  normalizeSourceParams,
  parseSourceId,
  SourceRuntimeError,
} from "./index"

describe("source service", () => {
  it("normalizes loader item arrays without metadata", () => {
    const items = [{
      title: "Example",
      url: "https://example.com",
    }]

    expect(normalizeSourceLoaderResult(items)).toEqual({ items })
  })

  it("preserves explicit loader metadata", () => {
    const result = {
      items: [{
        title: "Example",
        url: "https://example.com",
      }],
      metadata: {
        badge: "https://example.com/avatar.png?token=fresh",
      },
    }

    expect(normalizeSourceLoaderResult(result)).toBe(result)
  })

  it("parses provider-qualified source IDs", () => {
    expect(parseSourceId("rss:latest")).toEqual({
      provider: "rss",
      source: "latest",
    })
  })

  it("throws for invalid source IDs", () => {
    expect(() => parseSourceId("")).toThrowError(SourceRuntimeError)
    expect(() => parseSourceId("rss")).toThrowError(SourceRuntimeError)
    expect(() => parseSourceId("rss:latest:extra")).toThrowError(SourceRuntimeError)
  })

  it("normalizes parameter values using source parameter definitions", () => {
    const sourceDefinition = {
      params: {
        page: { type: "number", default: 1, title: "Page" },
        latest: { type: "switch", default: false, title: "Latest" },
        q: { type: "text", default: "top", title: "Query" },
      },
    } satisfies Pick<RuntimeSource, "params">

    expect(normalizeSourceParams(sourceDefinition, {
      page: "2",
      latest: "1",
      q: " top ",
    })).toEqual({
      page: 2,
      latest: true,
      q: "top",
    })
  })

  it("normalizes multiselect values using parameter helpers", () => {
    const sourceDefinition = {
      params: {
        tags: {
          type: "multiselect",
          default: ["tech"],
          values: [
            { label: "Tech", value: "tech" },
            { label: "World", value: "world" },
          ],
          title: "Tags",
        },
      },
    } satisfies Pick<RuntimeSource, "params">

    expect(normalizeSourceParams(sourceDefinition, {
      tags: "tech,world",
    })).toEqual({
      tags: ["tech", "world"],
    })

    expect(normalizeSourceParams(sourceDefinition, {
      tags: [" tech ", "world "],
    })).toEqual({
      tags: ["tech", "world"],
    })
  })
})
