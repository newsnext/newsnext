import type { RuntimeSource } from "@newsnext/source/typings"
import { flattenProviderConfig } from "@newsnext/source/utils/source"
import { describe, expect, it, vi } from "vitest"
import {
  configureSourceRegistryLoader,
  normalizeSourceParams,
  parseSourceId,
  resolveSource,
  SourceServiceError,
} from "./index"

describe("source service", () => {
  it("deduplicates registry loads and allows the transport to be replaced", async () => {
    const registry = flattenProviderConfig("remote", {
      title: "Remote",
      color: "blue",
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
    const loader = vi.fn().mockResolvedValue(registry)
    const restoreLoader = configureSourceRegistryLoader(loader)

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
      color: "blue",
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
      .mockResolvedValueOnce(registry)
    const restoreLoader = configureSourceRegistryLoader(loader)

    try {
      await expect(resolveSource("remote:latest")).rejects.toThrow("Temporary failure")
      await expect(resolveSource("remote:latest")).resolves.toMatchObject({
        providerTitle: "Remote",
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
    expect(() => parseSourceId("")).toThrowError(SourceServiceError)
    expect(() => parseSourceId("rss")).toThrowError(SourceServiceError)
    expect(() => parseSourceId("rss:latest:extra")).toThrowError(SourceServiceError)
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

  it("applies Liquid parameter templates before validation", async () => {
    const source = await resolveSource("telegram:channel")
    expect(normalizeSourceParams(source, {
      channel: "  @TestFlightCN  ",
    })).toEqual({
      channel: "TestFlightCN",
    })
  })

  it("rejects URL-like values for params handled by radar", async () => {
    const source = await resolveSource("netease-music:playlist")
    expect(() => normalizeSourceParams(source, {
      id: "https://music.163.com/playlist?id=5059661515&uct2=U2FsdGVkX1+h604nouVzL3eBMasVMbAgGM76vxJxHfw=",
    })).toThrowError(SourceServiceError)
  })
})
