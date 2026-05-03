import type { SourceParamSchemaMap } from "../../typings"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { myFetch } from "../fetch"
import { $source } from "./index"
import { $jsonLoader } from "./json-source"

// Mock fetch
vi.mock("../fetch", () => ({
  myFetch: vi.fn(),
}))

describe("$jsonSourceLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should parse simple json array correctly", async () => {
    const data = [
      { id: 1, title: "Item 1", link: "/1", ts: 100 },
      { id: 2, title: "Item 2", link: "/2", ts: 200 },
    ]

    ;(myFetch as any).mockResolvedValue(data)

    const source = $jsonLoader(() => ({
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

    const source = $jsonLoader(() => ({
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

  it("should handle function resolvers and itemsPath", async () => {
    const data = {
      data: [
        { name: "Func", url: "http://f", meta: { score: 99 } },
      ],
    }
    ;(myFetch as any).mockResolvedValue(data)

    const source = $jsonLoader(() => ({
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

  it("should handle custom fetch", async () => {
    const customFetch = vi.fn().mockResolvedValue([{ t: "Custom", u: "u" }])

    const source = $jsonLoader(() => ({
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

    const source = $source.json(
      {
        params: {
          headers: {
            type: "text",
            default: "{}",
            title: "Headers",
            parse: (value: unknown) => JSON.parse(String(value)) as Record<string, string>,
          },
        } satisfies SourceParamSchemaMap,
      },
      ({ headers }) => ({
        url: "https://api.example.com",
        fetchOptions: { headers },
        fields: {
          title: "title",
          url: "url",
        },
      }),
    )

    await (source as any).loader({
      headers: { authorization: "Bearer token" },
    })

    expect(myFetch).toHaveBeenCalledWith("https://api.example.com", {
      headers: { authorization: "Bearer token" },
    })
  })
})
