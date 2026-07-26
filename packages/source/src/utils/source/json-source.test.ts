import type { NewsItem, SourceParamSchemaMap } from "../../typings"
import type { SourceConfig } from "./index"
import type { JsonSourceOptions } from "./json-source"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { myFetch } from "../fetch"
import { resolveProvider } from "./index"
import { loadJson } from "./json-source"

// Mock fetch
vi.mock("../fetch", () => ({
  myFetch: vi.fn(),
}))

function createJsonTestSource(options: () => JsonSourceOptions<any>) {
  return { loader: async () => loadJson(options()) }
}

function createSource(config: SourceConfig) {
  return resolveProvider("test", {
    title: "Test",
    color: "blue",
    sources: { test: config },
  }).sources.test
}

describe("jSON source loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should parse simple json array correctly", async () => {
    const data = [
      { id: 1, title: "Item 1", link: "/1", ts: 100 },
      { id: 2, title: "Item 2", link: "/2", ts: 200 },
    ]

    ;(myFetch as any).mockResolvedValue(data)

    const source = createJsonTestSource(() => ({
      url: "https://api.example.com",
      fields: {
        title: "title",
        url: "link",
        timestamp: "ts",
      },
    }))

    const results = await (source as any).loader({})

    expect(results).toHaveLength(2)
    // Sorted by timestamp desc
    expect(results[0].title).toBe("Item 2")
    expect(results[0].timestamp).toBe(200)
  })

  it("should handle nested itemsPath", async () => {
    const data = {
      response: {
        items: [
          { name: "Nest", url: "http://n" },
        ],
      },
    }
    ;(myFetch as any).mockResolvedValue(data)

    const source = createJsonTestSource(() => ({
      url: "https://api.example.com",
      items: "response.items",
      fields: {
        title: "name",
        url: "url",
      },
    }))

    const results = await (source as any).loader({})
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe("Nest")
  })

  it("should preserve original order for hottest sources", async () => {
    const data = [
      { id: 1, title: "Item 1", link: "/1", ts: 100 },
      { id: 2, title: "Item 2", link: "/2", ts: 200 },
    ]
    ;(myFetch as any).mockResolvedValue(data)

    const source = createSource({
      type: "hottest",
      loader: {
        type: "json",
        url: "https://api.example.com",
        fields: {
          title: "title",
          url: "link",
          timestamp: "ts",
        },
      },
      capabilities: { network: ["api.example.com"], cookies: [], browser: [] },
      cache: { version: 1, maxAge: "5m" },
    })

    const results = await (source as any).loader({})
    expect(results.map((item: NewsItem) => item.title)).toEqual(["Item 1", "Item 2"])
  })

  it("infers capabilities and expands cache shorthand", () => {
    const provider = resolveProvider("test", {
      title: "Test",
      color: "blue",
      secrets: [{
        key: "session",
        type: "cookie",
        origin: "https://account.example.com",
        itemKey: "session",
      }],
      sources: {
        test: {
          loader: {
            type: "json",
            url: "https://api.example.com/items",
            fields: {
              title: "title",
              url: "url",
            },
          },
          cache: "5m",
        },
      },
    })

    expect(provider.sources.test.capabilities).toEqual({
      network: ["api.example.com"],
      cookies: ["account.example.com"],
      browser: [],
    })
    expect(provider.sources.test.cache).toEqual({
      version: 1,
      maxAge: "5m",
    })
  })

  it("should handle function resolvers and itemsPath", async () => {
    const data = {
      data: [
        { name: "Func", url: "http://f", meta: { score: 99 } },
      ],
    }
    ;(myFetch as any).mockResolvedValue(data)

    const source = createJsonTestSource(() => ({
      url: "https://api.example.com",
      items: json => json.data,
      fields: {
        title: (item: any) => item.name.toUpperCase(),
        url: "url",
        inline: {
          text: item => `Score: ${item.meta.score}`,
        },
      },
    }))

    const results = await (source as any).loader({})
    expect(results[0].title).toBe("FUNC")
    expect(results[0].inline.text).toBe("Score: 99")
  })

  it("should omit nullable optional field groups", async () => {
    ;(myFetch as any).mockResolvedValue([
      { title: "Item", url: "https://example.com", summary: null },
    ])

    const source = createJsonTestSource(() => ({
      url: "https://api.example.com",
      fields: {
        title: "title",
        url: "url",
        inline: {
          text: item => item.source,
        },
        preview: {
          text: item => item.summary,
        },
      },
    }))

    const results = await (source as any).loader({})
    expect(results[0].inline).toBeUndefined()
    expect(results[0].preview).toBeUndefined()
  })

  it("should handle custom fetch", async () => {
    const customFetch = vi.fn().mockResolvedValue([{ t: "Custom", u: "u" }])

    const source = createJsonTestSource(() => ({
      url: "http://c",
      fetch: customFetch,
      fields: { title: "t", url: "u" },
    }))

    const results = await (source as any).loader({})
    expect(customFetch).toHaveBeenCalled()
    expect(results[0].title).toBe("Custom")
  })

  it("should allow parsed runtime params to flow into fetch options", async () => {
    ;(myFetch as any).mockResolvedValue([{ title: "Parsed", url: "https://example.com" }])

    const source = createSource({
      params: {
        headers: {
          type: "text",
          default: "{}",
          title: "Headers",
          parse: (value: unknown) => JSON.parse(String(value)) as Record<string, string>,
        },
      } satisfies SourceParamSchemaMap,
      loader: {
        type: "json",
        url: "https://api.example.com",
        fetchOptions: ({ headers }) => ({ headers }),
        fields: {
          title: "title",
          url: "url",
        },
      },
      capabilities: { network: ["api.example.com"], cookies: [], browser: [] },
      cache: { version: 1, maxAge: "5m" },
    })

    await (source as any).loader({
      headers: { authorization: "Bearer token" },
    })

    expect(myFetch).toHaveBeenCalledWith("https://api.example.com", {
      headers: { authorization: "Bearer token" },
    })
  })

  it("rejects requests to hosts not declared by the source", async () => {
    const source = createSource({
      params: {
        endpoint: {
          type: "url",
          title: "Endpoint",
          default: "https://api.example.com/items",
        },
      } satisfies SourceParamSchemaMap,
      loader: {
        type: "json",
        url: ({ endpoint }) => endpoint,
        fields: {
          title: "title",
          url: "url",
        },
      },
      cache: "5m",
    })

    await expect(source.loader({
      endpoint: "https://private.example.com/items",
    })).rejects.toThrow(
      "Source \"test\" attempted to access undeclared host \"private.example.com\"",
    )
    expect(myFetch).not.toHaveBeenCalled()
  })

  it("supports wildcard network capability declarations", async () => {
    ;(myFetch as any).mockResolvedValue([{ title: "Item", url: "https://example.com/item" }])

    const source = createSource({
      params: {
        endpoint: {
          type: "url",
          title: "Endpoint",
          default: "https://api.example.com/items",
        },
      } satisfies SourceParamSchemaMap,
      loader: {
        type: "json",
        url: ({ endpoint }) => endpoint,
        fields: {
          title: "title",
          url: "url",
        },
      },
      capabilities: { network: ["*.example.com"] },
      cache: "5m",
    })

    await expect(source.loader({
      endpoint: "https://feed.api.example.com/items",
    })).resolves.toHaveLength(1)
    expect(myFetch).toHaveBeenCalledWith("https://feed.api.example.com/items", undefined)
  })
})
