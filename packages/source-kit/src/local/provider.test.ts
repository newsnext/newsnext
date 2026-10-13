import { describe, expect, it } from "vitest"
import { resolveProvider } from "../registry/provider"
import { toSourceDescriptor } from "../runtime"
import { bindLocalProvider, serializeLocalProvider } from "./provider"

describe("local Provider transport", () => {
  it("preserves defaults, callback identity and resolved descriptors", () => {
    const load = async () => ({ items: [{ title: "Title", url: "/story" }] })
    const annotation = () => "Label"
    const provider = {
      title: "Example",
      color: "slate" as const,
      defaults: { baseUrl: "https://example.com/", loader: { type: "custom" as const, load, annotation } },
      sources: {
        feed: { metadata: { title: "Feed", home: "/feed" } },
        second: { loader: { annotation: "{{ scope.item.title }}" } },
      },
    }
    const serialized = serializeLocalProvider(provider)
    const wire = JSON.parse(JSON.stringify(serialized.provider))
    const bound = bindLocalProvider(wire, reference => serialized.functions.get(reference.$sourceFunction)!.invoke)
    const loader = bound.defaults?.loader
    expect(loader && "load" in loader ? loader.load : undefined).toBe(load)
    expect(serialized.functions.size).toBe(2)
    const original = resolveProvider("example", provider)
    const restored = resolveProvider("example", bound)
    for (const key of Object.keys(original.sources)) {
      const id = `example:${key}`
      expect(toSourceDescriptor(id, restored.sources[key]!)).toEqual(toSourceDescriptor(id, original.sources[key]!))
    }
  })

  it("supports custom request callbacks without serializing their closure", () => {
    const request = async () => new Response("body")
    const { provider, functions } = serializeLocalProvider({
      title: "Example",
      color: "slate",
      sources: { feed: { loader: { type: "json", url: "https://example.com/", request, fields: { title: "title", url: "url" } } } },
    })
    const bound = bindLocalProvider(provider, reference => functions.get(reference.$sourceFunction)!.invoke)
    const loader = bound.sources.feed?.loader
    expect(loader && "request" in loader ? loader.request : undefined).toBe(request)
    expect([...functions.values()][0]).toMatchObject({ kind: "request", source: "feed" })
  })

  it("rejects functions outside supported slots and spoofed references", () => {
    expect(() => serializeLocalProvider({ sources: { feed: { metadata: { title: () => "bad" } } } })).toThrow("Unsupported Source function")
    const value = { sources: { feed: { loader: { load: { $sourceFunction: "[\"defaults\",\"loader\",\"load\"]", kind: "load" } } } } }
    expect(() => bindLocalProvider(value, () => () => undefined)).toThrow("Invalid Source function reference")
    expect(() => serializeLocalProvider(value)).toThrow("Reserved Source key")
  })

  it("rejects cycles, non-JSON objects, unsafe keys and unbounded definitions", () => {
    const circular: Record<string, unknown> = {}
    circular.sources = circular
    expect(() => serializeLocalProvider(circular)).toThrow("Non-serializable")
    expect(() => serializeLocalProvider({ sources: { feed: { vars: { date: new Date() } } } })).toThrow("Non-serializable Source object")
    expect(() => serializeLocalProvider(JSON.parse("{\"sources\":{\"__proto__\":{}}}"))).toThrow("Reserved Source key")
    expect(() => serializeLocalProvider({ sources: {} })).toThrow("Source count")
    expect(() => serializeLocalProvider({ sources: { feed: {} }, title: "x".repeat(2 * 1024 * 1024) })).toThrow("exceeds 2 MiB")
  })
})
