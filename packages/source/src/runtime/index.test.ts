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

  it("applies Liquid parameter templates before validation", () => {
    const sourceDefinition = {
      params: {
        channel: {
          type: "text",
          default: "TestFlightCN",
          title: "Channel",
          pattern: "^(?![\\d_])\\w{5,32}$",
          template: "{{ scope.value | remove_first: '@' }}",
        },
      },
    } satisfies Pick<RuntimeSource, "params">

    expect(normalizeSourceParams(sourceDefinition, {
      channel: "  @TestFlightCN  ",
    })).toEqual({
      channel: "TestFlightCN",
    })
  })

  it("exposes source vars to parameter templates", () => {
    const sourceDefinition = {
      vars: {
        prefix: "channel-",
      },
      params: {
        channel: {
          type: "text",
          default: "news",
          title: "Channel",
          template: "{{ source.vars.prefix }}{{ scope.value }}",
        },
      },
    } satisfies Pick<RuntimeSource, "params" | "vars">

    expect(normalizeSourceParams(sourceDefinition)).toEqual({
      channel: "channel-news",
    })
  })

  it("rejects URL-like values for params handled by radar", () => {
    const sourceDefinition = {
      params: {
        id: {
          type: "text",
          default: "19723756",
          title: "Playlist",
          pattern: "^\\d+$",
        },
      },
    } satisfies Pick<RuntimeSource, "params">

    expect(() => normalizeSourceParams(sourceDefinition, {
      id: "https://music.163.com/playlist?id=5059661515&uct2=U2FsdGVkX1+h604nouVzL3eBMasVMbAgGM76vxJxHfw=",
    })).toThrowError(SourceRuntimeError)
  })
})
