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

function createJsonTestSource(options: () => JsonSourceOptions) {
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

  it("supports JMESPath filtering, sorting, and projections", async () => {
    ;(myFetch as any).mockResolvedValue({
      response: {
        items: [
          { name: "Low", category: "A", score: 5, id: 1 },
          { name: "High", category: "B", score: 30, id: 2 },
          { name: "Medium", category: "C", score: 20, id: 3 },
        ],
      },
    })

    const source = createJsonTestSource(() => ({
      url: "https://api.example.com",
      items: "reverse(sort_by(response.items[?score > `10`], &score))",
      fields: {
        title: "join(' · ', [name, category])",
        url: {
          select: "id",
          template: "https://example.com/items/{{ value }}",
        },
        inline: {
          text: {
            select: "score",
            template: "Score: {{ value | times: 2 }}",
          },
        },
      },
    }))

    const results = await (source as any).loader({})
    expect(results.map((item: NewsItem) => item.title)).toEqual(["High · B", "Medium · C"])
    expect(results[0].inline?.text).toBe("Score: 60")
  })

  it("supports conditional JMESPath object construction", async () => {
    ;(myFetch as any).mockResolvedValue([
      {
        title: "With mark",
        url: "https://example.com/1",
        card_label: {
          night_icon: "https://example.com/mark.png",
        },
      },
      {
        title: "Without mark",
        url: "https://example.com/2",
      },
    ])

    const source = createJsonTestSource(() => ({
      url: "https://api.example.com",
      fields: {
        title: "title",
        url: "url",
        inline: {
          mark: "card_label.night_icon && {src: card_label.night_icon, radius: `0`}",
        },
      },
    }))

    const results = await (source as any).loader({})

    expect(results[0].inline?.mark).toEqual({
      src: "https://example.com/mark.png",
      radius: 0,
    })
    expect(results[1].inline).toBeUndefined()
  })

  it("rejects invalid JMESPath expressions during source registration", () => {
    expect(() => createSource({
      loader: {
        type: "json",
        url: "https://api.example.com",
        items: "items[",
        fields: {
          title: "title",
          url: "url",
        },
      },
      cache: "5m",
    })).toThrow("Invalid JMESPath expression at test:test.loader.items")
  })

  it("rejects prototype access in JMESPath expressions", () => {
    expect(() => createSource({
      loader: {
        type: "json",
        url: "https://api.example.com",
        fields: {
          title: "constructor.name",
          url: "url",
        },
      },
      cache: "5m",
    })).toThrow("JMESPath property \"constructor\" is not allowed")
  })

  it("restricts parameter templates to the raw value", () => {
    expect(() => createSource({
      params: {
        topic: {
          type: "text",
          title: "Topic",
          default: "news",
          template: "{{ params.topic }}",
        },
      },
      loader: {
        type: "json",
        url: "https://api.example.com",
        fields: {
          title: "title",
          url: "url",
        },
      },
      cache: "5m",
    })).toThrow("Invalid Liquid template at test:test.params.topic.template")
  })

  it("restricts fetch option templates to parsed parameters", () => {
    expect(() => createSource({
      loader: {
        type: "json",
        url: "https://api.example.com",
        fetchOptions: {
          headers: {
            authorization: "Bearer {{ value }}",
          },
        },
        fields: {
          title: "title",
          url: "url",
        },
      },
      cache: "5m",
    })).toThrow("Invalid Liquid template at test:test.loader.fetchOptions.headers.authorization")
  })

  it("should preserve original order for hottest sources", async () => {
    const data = [
      { id: 1, title: "Item 1", link: "/1", ts: 100 },
      { id: 2, title: "Item 2", link: "/2", ts: 200 },
    ]
    ;(myFetch as any).mockResolvedValue(data)

    const source = createSource({
      metadata: {
        type: "hottest",
      },
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

  it("should compose JMESPath selection with Liquid formatting", async () => {
    const data = {
      data: [
        { name: "Func", url: "http://f", meta: { score: 99 } },
      ],
    }
    ;(myFetch as any).mockResolvedValue(data)

    const source = createJsonTestSource(() => ({
      url: "https://api.example.com",
      items: "data",
      fields: {
        title: {
          select: "name",
          template: "{{ value | upcase }}",
        },
        url: "url",
        inline: {
          text: {
            template: "Score: {{ item.meta.score }}",
          },
        },
      },
    }))

    const results = await (source as any).loader({})
    expect(results[0].title).toBe("FUNC")
    expect(results[0].inline.text).toBe("Score: 99")
  })

  it("should render field templates against each item", async () => {
    ;(myFetch as any).mockResolvedValue({
      label: "Latest",
      items: [
        {
          id: 42,
          title: "Template",
          source: "News",
          category: "Tech",
          summary: "<script>alert(1)</script>",
        },
      ],
    })

    const source = createJsonTestSource(() => ({
      url: "https://api.example.com",
      items: "items",
      fields: {
        title: {
          template: "{{ json.label }}: {{ item.title }}",
        },
        url: {
          select: "id",
          template: "https://example.com/items/{{ value }}",
        },
        inline: {
          text: {
            template: "{{ item.source }}{% if item.category %} · {{ item.category }}{% endif %}",
          },
        },
        preview: {
          html: {
            select: "summary",
            template: "<strong>{{ value }}</strong>",
          },
        },
      },
    }))

    const results = await (source as any).loader({})
    expect(results[0]).toMatchObject({
      title: "Latest: Template",
      url: "https://example.com/items/42",
      inline: { text: "News · Tech" },
      preview: {
        html: "<strong>&lt;script&gt;alert(1)&lt;/script&gt;</strong>",
      },
    })
  })

  it("should expose params, request details, and indexes to field templates", async () => {
    ;(myFetch as any).mockResolvedValue([
      { id: 7, title: "Context" },
    ])

    const source = createSource({
      params: {
        section: { type: "text", default: "tech", title: "Section" },
      } satisfies SourceParamSchemaMap,
      loader: {
        type: "json",
        url: "https://api.example.com/{{ params.section | url_path }}",
        fields: {
          title: {
            template: "{{ index }}: {{ item.title }}",
          },
          url: {
            select: "id",
            template: "https://example.com/{{ params.section | url_path }}/{{ value | url_path }}",
          },
          inline: {
            text: {
              template: "{{ requestUrl }}",
            },
          },
        },
      },
      cache: "5m",
    })

    const results = await (source as any).loader({ section: "world" })
    expect(results[0]).toMatchObject({
      title: "0: Context",
      url: "https://example.com/world/7",
      inline: { text: "https://api.example.com/world" },
    })
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
          text: "source",
        },
        preview: {
          text: "summary",
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

  it("should render parameterized fetch options with Liquid", async () => {
    ;(myFetch as any).mockResolvedValue([{ title: "Parsed", url: "https://example.com" }])

    const source = createSource({
      params: {
        token: {
          type: "text",
          default: "",
          title: "Token",
          template: "{{ value | strip }}",
        },
      } satisfies SourceParamSchemaMap,
      loader: {
        type: "json",
        url: "https://api.example.com",
        fetchOptions: {
          headers: {
            authorization: "Bearer {{ params.token }}",
          },
        },
        fields: {
          title: "title",
          url: "url",
        },
      },
      capabilities: { network: ["api.example.com"], cookies: [], browser: [] },
      cache: { version: 1, maxAge: "5m" },
    })

    await (source as any).loader({
      token: "token",
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
        url: "{{ params.endpoint }}",
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
        url: "{{ params.endpoint }}",
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
