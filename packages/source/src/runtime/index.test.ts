import type { RuntimeSource } from "@newsnext/source/types"
import { flattenProviderConfig, resolveSourceRegistry } from "@newsnext/source/registry"
import { describe, expect, it, vi } from "vitest"
import {
  configureExternalSourcesLoader,
  normalizeSourceParams,
  parseSourceId,
  resolveSource,
  SourceRuntimeError,
} from "./index"

describe("source service", () => {
  it("deduplicates registry loads and allows the transport to be replaced", async () => {
    const registry = flattenProviderConfig("remote", {
      title: "Remote",
      defaults: {
        metadata: {
          color: "blue",
        },
      },
      sources: {
        latest: {
          cache: "5m",
          loader: {
            type: "rss",
            url: "https://example.com/feed.xml",
          },
        },
      },
    })
    const loader = vi.fn().mockResolvedValue(resolveSourceRegistry(registry))
    const restoreLoader = configureExternalSourcesLoader(loader)

    try {
      const [first, second] = await Promise.all([
        resolveSource("remote:latest"),
        resolveSource("remote:latest"),
      ])

      expect(first).toBe(second)
      expect(loader).toHaveBeenCalledTimes(1)
    } finally {
      restoreLoader()
    }
  })

  it("retries registry loading after a transient transport failure", async () => {
    const registry = flattenProviderConfig("remote", {
      title: "Remote",
      defaults: {
        metadata: {
          color: "blue",
        },
      },
      sources: {
        latest: {
          cache: "5m",
          loader: {
            type: "rss",
            url: "https://example.com/feed.xml",
          },
        },
      },
    })
    const loader = vi.fn()
      .mockRejectedValueOnce(new Error("Temporary failure"))
      .mockResolvedValueOnce(resolveSourceRegistry(registry))
    const restoreLoader = configureExternalSourcesLoader(loader)

    try {
      await expect(resolveSource("remote:latest")).rejects.toThrow("Temporary failure")
      await expect(resolveSource("remote:latest")).resolves.toMatchObject({
        provider: {
          title: "Remote",
        },
      })
      expect(loader).toHaveBeenCalledTimes(2)
    } finally {
      restoreLoader()
    }
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
          template: "{{ value | remove_first: '@' }}",
        },
      },
    } satisfies Pick<RuntimeSource, "params">

    expect(normalizeSourceParams(sourceDefinition, {
      channel: "  @TestFlightCN  ",
    })).toEqual({
      channel: "TestFlightCN",
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
