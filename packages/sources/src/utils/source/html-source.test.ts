import iconv from "iconv-lite"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { myFetch } from "../fetch"
import { $htmlLoader } from "./html-source"

// Mock fetch
vi.mock("../fetch", () => ({
  myFetch: vi.fn(),
}))

describe("$htmlSourceLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should parse simple html correctly", async () => {
    const html = `
      <div class="list">
        <div class="item">
          <a class="title" href="/article/1">Article 1</a>
          <span class="date">123456</span>
        </div>
        <div class="item">
          <a class="title" href="/article/2">Article 2</a>
          <span class="date">123457</span>
        </div>
      </div>
    `

    // Setup mock
    ;(myFetch as any).mockResolvedValue(html)

    const source = $htmlLoader(() => ({
      url: "https://example.com",
      itemSelector: ".list .item",
      fields: {
        title: ".title",
        url: { selector: ".title", attr: "href" },
        timestamp: ".date",
      },
    }))

    const results = await (source as any).loader({})

    expect(results).toHaveLength(2)
    // Results are sorted by timestamp desc by default
    expect(results[0].title).toBe("Article 2")
    expect(results[0].url).toBe("/article/2")
    expect(results[0].timestamp).toBe("123457")
  })

  it("should support transforms", async () => {
    const html = `
      <div class="item">
        <div class="title">  Dirty Title  </div>
        <span class="date" data-ts="1600000000">Date</span>
      </div>
    `
    ;(myFetch as any).mockResolvedValue(html)

    const source = $htmlLoader(() => ({
      url: "https://example.com",
      itemSelector: ".item",
      fields: {
        title: {
          selector: ".title",
          transform: val => val?.toUpperCase(),
        },
        url: {
          // Mocking a url since it's required
          selector: ".title", // just to select something
          transform: () => "https://example.com/1",
        },
        timestamp: {
          selector: ".date",
          attr: "data-ts",
          transform: val => Number(val) * 1000,
        },
      },
    }))

    const results = await (source as any).loader({})
    expect(results[0].title).toBe("DIRTY TITLE")
    expect(results[0].timestamp).toBe(1600000000000)
  })

  it("should handle params in url function", async () => {
    ;(myFetch as any).mockResolvedValue("<div class=\"item\"></div>")

    const source = $htmlLoader({
      page: { type: "number", default: 1, title: "Page" },
    }, params => ({
      url: `https://example.com?p=${params.page}`,
      itemSelector: ".item",
      fields: { title: ".t", url: ".u" },
    }))

    await (source as any).loader({ page: 2 })

    expect(myFetch).toHaveBeenCalledWith("https://example.com?p=2", undefined)
  })

  it("should handle non-utf8 decoding", async () => {
    const gb2312Buffer = iconv.encode("<div class=\"item\"><div class=\"title\">你好</div></div>", "gb2312")

    // Mock fetch returning array buffer
    ;(myFetch as any).mockResolvedValue(gb2312Buffer)

    const source = $htmlLoader(() => ({
      url: "https://example.com/gb",
      decoding: "gb2312",
      itemSelector: ".item",
      fields: {
        title: ".title",
        url: { transform: () => "http://u" },
      },
    }))

    const results = await (source as any).loader({})

    expect(myFetch).toHaveBeenCalledWith("https://example.com/gb", { responseType: "arrayBuffer" })
    expect(results[0].title).toBe("你好")
  })

  it("should handle custom loader", async () => {
    const html = "<div class=\"item\"><div class=\"title\">Custom Fetch</div></div>"

    const customFetch = vi.fn().mockResolvedValue(html)

    const source = $htmlLoader(() => ({
      url: "https://example.com/custom",
      fetch: customFetch,
      itemSelector: ".item",
      fields: {
        title: ".title",
        url: { transform: () => "http://u" },
      },
    }))

    const results = await (source as any).loader({})

    expect(customFetch).toHaveBeenCalledWith("https://example.com/custom")
    expect(results[0].title).toBe("Custom Fetch")
    // Ensure default fetch was NOT called
    expect(myFetch).not.toHaveBeenCalled()
  })
})
