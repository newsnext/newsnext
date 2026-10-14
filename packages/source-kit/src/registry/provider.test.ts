import type { ProviderConfig } from "./types"
import { describe, expect, it } from "vitest"
import { toSourceDescriptor } from "../runtime"
import { resolveProvider } from "./provider"

const provider: ProviderConfig = {
  title: "Example",
  color: "slate",
  defaults: {
    baseUrl: "https://example.com/",
    vars: { endpoint: { origin: "https://example.com", version: "v1" } },
    loader: { type: "rss", url: "/default.xml" },
  },
  sources: {
    feed: {
      vars: { endpoint: { version: "v2" } },
      loader: { url: "{{ source.vars.endpoint.origin }}/feed.xml" },
      params: { limit: { type: "number", title: "Limit", default: 10 } },
    },
  },
}

describe("unified Provider resolution", () => {
  it("resolves JSON and module definitions with identical inherited data", () => {
    const json = resolveProvider("example", JSON.parse(JSON.stringify(provider))).sources.feed!
    const module = resolveProvider("example", provider).sources.feed!
    expect(toSourceDescriptor("example:feed", json)).toEqual(toSourceDescriptor("example:feed", module))
    expect(module.vars).toEqual({ endpoint: { origin: "https://example.com", version: "v2" } })
    expect(module.provider).toEqual({ title: "Example", color: "slate" })
  })

  it("allows callbacks only in loader slots without calling them during resolution", () => {
    let calls = 0
    const load = async () => {
      calls++
      return { items: [] }
    }
    const custom = { ...provider, defaults: { loader: { type: "custom" as const, load } } }
    expect(resolveProvider("example", custom).sources.feed?.loader).toBeTypeOf("function")
    expect(calls).toBe(0)
    expect(() => resolveProvider("example", {
      ...provider,
      defaults: { vars: { value: load } },
    })).toThrow()
  })

  it("rejects the same invalid fields for JSON and module definitions", () => {
    for (const patch of [
      { unexpected: true },
      { params: { limit: { type: "number", title: "Limit", default: "ten" } } },
      { capabilities: { network: "example.com" } },
      { loader: { sortByTimestamp: "yes" } },
    ]) {
      const invalid = { ...provider, sources: { feed: { ...provider.sources.feed, ...patch } } }
      for (const input of [invalid, JSON.parse(JSON.stringify(invalid))]) {
        expect(() => resolveProvider("example", input)).toThrow()
      }
    }
  })
})
