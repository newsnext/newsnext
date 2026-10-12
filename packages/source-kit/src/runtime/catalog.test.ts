import type { RuntimeSource, SourceDescriptor, SourceLoader } from "../types"
import { describe, expect, it } from "vitest"
import { mergeSourceCatalogs, resolveSourceCatalog } from "./catalog"

const loader: SourceLoader = async () => ({ items: [] })

function descriptor(id: string, title = "Example"): SourceDescriptor {
  return { id, provider: { title, color: "slate" }, version: 3, metadata: { title: "Latest" }, capabilities: { network: ["example.com"], cookies: [] } }
}

function source(title: string): RuntimeSource {
  const { id: _id, ...value } = descriptor("example:latest", title)
  return { ...value, loader }
}

describe("source catalog precedence", () => {
  it("lets higher-priority Providers completely replace lower-priority Providers", () => {
    const standalone = { "example:custom": source("Standalone") }
    const plugin = { "example:latest": source("Plugin"), "plugin:latest": source("Plugin") }
    const bundled = { "example:latest": source("Bundled"), "example:top": source("Bundled"), "other:latest": source("Other") }
    const merged = mergeSourceCatalogs(standalone, plugin, bundled)
    expect(Object.keys(merged)).toEqual(["example:custom", "plugin:latest", "other:latest"])
    expect(merged["example:custom"]).toBe(standalone["example:custom"])
    expect(merged["plugin:latest"]).toBe(plugin["plugin:latest"])
    expect(bundled).toHaveProperty("example:latest")
  })

  it("restores the next Provider when a higher-priority catalog is removed", () => {
    const plugin = { "example:latest": source("Plugin") }
    const bundled = { "example:latest": source("Bundled"), "example:top": source("Bundled") }
    expect(mergeSourceCatalogs({}, plugin, bundled)).toEqual(plugin)
    expect(mergeSourceCatalogs({}, {}, bundled)).toEqual(bundled)
  })
})

describe("resolved Source catalog", () => {
  it("preserves resolved metadata and binds only the execution backend", () => {
    const input = descriptor("example:latest")
    const catalog = resolveSourceCatalog({ [input.id]: input }, () => loader)
    expect(catalog[input.id]).toEqual({ provider: input.provider, version: 3, metadata: input.metadata, capabilities: input.capabilities, loader })
    expect(input).not.toHaveProperty("loader")
  })

  it("rejects identity mismatches, authoring loaders, and malformed resolved fields", () => {
    const input = descriptor("example:latest")
    for (const invalid of [
      { ...input, id: "other:latest" },
      { ...input, loader: { type: "custom" } },
      { ...input, version: undefined },
      { ...input, capabilities: {} },
      { ...input, provider: { title: "Example", color: "unknown" } },
      { ...input, params: { count: { type: "number", title: "Count", default: "ten" } } },
    ]) {
      expect(() => resolveSourceCatalog({ "example:latest": invalid }, () => loader)).toThrow()
    }
  })
})
