import { beforeEach, describe, expect, it, vi } from "vitest"
import { myFetch } from "../src/utils/fetch"
import { defineJsonSourceGetter } from "../src/utils/json-source"

// Mock fetch
vi.mock("../src/utils/fetch", () => ({
  myFetch: vi.fn(),
}))

describe("defineJsonSource", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should parse simple json array correctly", async () => {
    const data = [
      { id: 1, title: "Item 1", link: "/1", ts: 100 },
      { id: 2, title: "Item 2", link: "/2", ts: 200 },
    ]

    ;(myFetch as any).mockResolvedValue(data)

    const source = defineJsonSourceGetter(() => ({
      url: "https://api.example.com",
      fields: {
        title: "title",
        url: "link",
        updated: "ts",
      },
    }))

    const results = await (source as any).getter({})

    expect(results).toHaveLength(2)
    // Sorted by updated desc
    expect(results[0].title).toBe("Item 2")
    expect(results[0].updated).toBe(200)
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

    const source = defineJsonSourceGetter(() => ({
      url: "https://api.example.com",
      items: "response.items",
      fields: {
        title: "name",
        url: "url",
      },
    }))

    const results = await (source as any).getter({})
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

    const source = defineJsonSourceGetter(() => ({
      url: "https://api.example.com",
      items: json => json.data,
      fields: {
        title: (item: any) => item.name.toUpperCase(),
        url: "url",
        extra: {
          info: item => `Score: ${item.meta.score}`,
        },
      },
    }))

    const results = await (source as any).getter({})
    expect(results[0].title).toBe("FUNC")
    expect(results[0].extra.info).toBe("Score: 99")
  })

  it("should handle custom fetch", async () => {
    const customFetch = vi.fn().mockResolvedValue([{ t: "Custom", u: "u" }])

    const source = defineJsonSourceGetter(() => ({
      url: "http://c",
      fetch: customFetch,
      fields: { title: "t", url: "u" },
    }))

    const results = await (source as any).getter({})
    expect(customFetch).toHaveBeenCalled()
    expect(results[0].title).toBe("Custom")
  })
})
