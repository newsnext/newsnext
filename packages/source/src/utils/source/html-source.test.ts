import type { NewsItem, SourceParamSchemaMap } from "../../typings"
import type { SourceConfig } from "./index"
import iconv from "iconv-lite"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { myFetch } from "../fetch"
import { loadHtml } from "./html-source"
import { resolveProvider } from "./index"

// Mock fetch
vi.mock("../fetch", () => ({
  myFetch: vi.fn(),
}))

function createHtmlTestSource(options: () => Parameters<typeof loadHtml>[0]) {
  return { loader: async () => loadHtml(options()) }
}

function createSource(config: SourceConfig) {
  return resolveProvider("test", {
    title: "Test",
    color: "blue",
    sources: { test: config },
  }).sources.test
}

describe("hTML source loader", () => {
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

    const source = createHtmlTestSource(() => ({
      url: "https://example.com",
      items: ".list .item",
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
    expect(results[0].timestamp).toBe(123457)
  })

  it("should support declarative transforms", async () => {
    const html = `
      <div class="item">
        <div class="title">  Dirty Title  </div>
        <span class="date" data-ts="1600000000">Date</span>
      </div>
    `
    ;(myFetch as any).mockResolvedValue(html)

    const source = createHtmlTestSource(() => ({
      url: "https://example.com",
      items: ".item",
      fields: {
        title: {
          selector: ".title",
          transforms: [{ type: "uppercase" }],
        },
        url: {
          selector: ".title",
          template: "https://example.com/1",
        },
        timestamp: {
          selector: ".date",
          attr: "data-ts",
          transforms: [{ type: "multiply", value: 1000 }],
        },
      },
    }))

    const results = await (source as any).loader({})
    expect(results[0].title).toBe("DIRTY TITLE")
    expect(results[0].timestamp).toBe(1600000000000)
  })

  it("should support template transforms", async () => {
    ;(myFetch as any).mockResolvedValue(`
      <div class="item">
        <a class="title" href="/article/1">Article 1</a>
        <div class="summary">&lt;script&gt;alert(1)&lt;/script&gt;</div>
      </div>
    `)

    const source = createHtmlTestSource(() => ({
      url: "https://example.com",
      items: ".item",
      fields: {
        title: ".title",
        url: {
          selector: ".title",
          attr: "href",
          template: "https://example.com{{ value }}",
        },
        preview: {
          html: {
            selector: ".summary",
            template: "<strong>{{ value }}</strong>",
          },
        },
      },
    }))

    const results = await (source as any).loader({})
    expect(results[0].url).toBe("https://example.com/article/1")
    expect(results[0].preview.html).toBe(
      "<strong>&lt;script&gt;alert(1)&lt;/script&gt;</strong>",
    )
  })

  it("should expose the extracted item and loader context to templates", async () => {
    ;(myFetch as any).mockResolvedValue(`
      <article class="item">
        <a class="title" href="/article/1">  Article One  </a>
        <span class="category">Engineering</span>
      </article>
    `)

    const source = createSource({
      params: {
        prefix: { type: "text", default: "News", title: "Prefix" },
      } satisfies SourceParamSchemaMap,
      loader: {
        type: "html",
        url: "https://example.com/news",
        items: ".item",
        fields: {
          title: {
            selector: ".title",
            transforms: [{ type: "normalizeWhitespace" }],
            template: "{{ params.prefix }}: {{ value }} ({{ item.inline.text }})",
          },
          url: {
            selector: ".title",
            attr: "href",
            transforms: [{ type: "resolveUrl" }],
          },
          inline: {
            text: ".category",
          },
          preview: {
            text: {
              selector: ".category",
              template: "{{ item.title }} #{{ index }} @ {{ requestUrl }}",
            },
          },
        },
      },
      cache: "5m",
    })

    const results = await (source as any).loader({ prefix: "Latest" })

    expect(results[0]).toMatchObject({
      title: "Latest: Article One (Engineering)",
      url: "https://example.com/article/1",
      inline: { text: "Engineering" },
      preview: {
        text: "Article One #0 @ https://example.com/news",
      },
    })
  })

  it("should support selector fallbacks, document scope, HTML content, and joined matches", async () => {
    ;(myFetch as any).mockResolvedValue(`
      <meta property="og:site_name" content="Example News">
      <article class="item">
        <a class="fallback-title" href="/article/1"><strong>Article</strong> One</a>
        <span class="tag">TypeScript</span>
        <span class="tag">React</span>
      </article>
    `)

    const source = createHtmlTestSource(() => ({
      url: "https://example.com/news",
      items: ".item",
      fields: {
        title: {
          selector: [".missing-title", ".fallback-title"],
          content: "html",
        },
        url: {
          selector: ".fallback-title",
          attr: "href",
          transforms: [{ type: "resolveUrl" }],
        },
        inline: {
          text: {
            selector: ".tag",
            all: true,
            separator: " · ",
          },
        },
        preview: {
          text: {
            scope: "document",
            selector: "meta[property='og:site_name']",
            attr: "content",
          },
          html: {
            selector: ".fallback-title",
            content: "outerHtml",
            template: "<div>{{ value }}</div>",
          },
        },
      },
    }))

    const results = await (source as any).loader({})

    expect(results[0]).toMatchObject({
      title: "<strong>Article</strong> One",
      url: "https://example.com/article/1",
      inline: { text: "TypeScript · React" },
      preview: {
        text: "Example News",
        html: "<div>&lt;a class=&#34;fallback-title&#34; href=&#34;/article/1&#34;&gt;&lt;strong&gt;Article&lt;/strong&gt; One&lt;/a&gt;</div>",
      },
    })
  })

  it("should traverse DOM relationships before selecting a field", async () => {
    ;(myFetch as any).mockResolvedValue(`
      <table>
        <tr class="item"><td><a class="title" href="/1">Article</a></td></tr>
        <tr class="metadata"><td><span class="score">42 points</span></td></tr>
      </table>
    `)

    const source = createHtmlTestSource(() => ({
      url: "https://example.com/news",
      items: ".item",
      fields: {
        title: ".title",
        url: {
          selector: ".title",
          attr: "href",
          transforms: [{ type: "resolveUrl" }],
        },
        inline: {
          text: {
            traverse: { type: "next", selector: ".metadata" },
            selector: ".score",
          },
        },
      },
    }))

    const results = await (source as any).loader({})

    expect(results[0].inline?.text).toBe("42 points")
  })

  it("should resolve items with a function and filter items", async () => {
    const html = `
      <div class="list">
        <article class="item">
          <a class="title" href="/article/1">Article 1</a>
        </article>
        <article class="item is-ad">
          <a class="title" href="/ad">Ad</a>
        </article>
        <article class="item">
          <a class="title" href="/article/2">Article 2</a>
        </article>
      </div>
    `
    ;(myFetch as any).mockResolvedValue(html)

    const source = createHtmlTestSource(() => ({
      url: "https://example.com",
      items: $ => $(".list .item"),
      filter: el => !el.hasClass("is-ad"),
      fields: {
        title: ".title",
        url: { selector: ".title", attr: "href" },
      },
    }))

    const results = await (source as any).loader({})
    expect(results).toHaveLength(2)
    expect(results.map((item: NewsItem) => item.title)).toEqual(["Article 1", "Article 2"])
  })

  it("should preserve original order for hottest sources", async () => {
    const html = `
      <div class="item">
        <a class="title" href="/article/1">Article 1</a>
        <span class="date">100</span>
      </div>
      <div class="item">
        <a class="title" href="/article/2">Article 2</a>
        <span class="date">200</span>
      </div>
    `
    ;(myFetch as any).mockResolvedValue(html)

    const source = createSource({
      type: "hottest",
      loader: {
        type: "html",
        url: "https://example.com",
        items: ".item",
        fields: {
          title: ".title",
          url: { selector: ".title", attr: "href" },
          timestamp: ".date",
        },
      },
      capabilities: { network: ["example.com"], cookies: [], browser: [] },
      cache: { version: 1, maxAge: "5m" },
    })

    const results = await (source as any).loader({})
    expect(results.map((item: NewsItem) => item.title)).toEqual(["Article 1", "Article 2"])
  })

  it("should filter items with a selector", async () => {
    const html = `
      <div class="item"><a class="title" href="/1">Normal</a></div>
      <div class="item pinned"><a class="title" href="/2">Pinned</a></div>
    `
    ;(myFetch as any).mockResolvedValue(html)

    const source = createHtmlTestSource(() => ({
      url: "https://example.com",
      items: ".item",
      filter: ".pinned",
      fields: {
        title: ".title",
        url: { selector: ".title", attr: "href" },
      },
    }))

    const results = await (source as any).loader({})
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe("Pinned")
  })

  it("should handle params in url function", async () => {
    ;(myFetch as any).mockResolvedValue("<div class=\"item\"></div>")

    const source = createSource({
      params: {
        page: { type: "number", default: 1, title: "Page" },
      } satisfies SourceParamSchemaMap,
      loader: {
        type: "html",
        url: params => `https://example.com?p=${params.page}`,
        items: ".item",
        fields: { title: ".t", url: ".u" },
      },
      capabilities: { network: ["example.com"], cookies: [], browser: [] },
      cache: { version: 1, maxAge: "5m" },
    })

    await (source as any).loader({ page: 2 })

    expect(myFetch).toHaveBeenCalledWith("https://example.com?p=2", undefined)
  })

  it("should render params in URL templates", async () => {
    ;(myFetch as any).mockResolvedValue("<div class=\"item\"></div>")

    const source = createSource({
      params: {
        topic: { type: "text", default: "news", title: "Topic" },
      } satisfies SourceParamSchemaMap,
      loader: {
        type: "html",
        url: "https://example.com/{{ params.topic | strip | url_path }}",
        items: ".item",
        fields: { title: ".t", url: ".u" },
      },
      cache: "5m",
    })

    await (source as any).loader({ topic: "c++ news" })

    expect(myFetch).toHaveBeenCalledWith("https://example.com/c%2B%2B%20news", undefined)
  })

  it("should handle non-utf8 decoding", async () => {
    const gb2312Buffer = iconv.encode("<div class=\"item\"><div class=\"title\">你好</div></div>", "gb2312")

    // Mock fetch returning array buffer
    ;(myFetch as any).mockResolvedValue(gb2312Buffer)

    const source = createHtmlTestSource(() => ({
      url: "https://example.com/gb",
      decoding: "gb2312",
      items: ".item",
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

    const source = createHtmlTestSource(() => ({
      url: "https://example.com/custom",
      fetch: customFetch,
      items: ".item",
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
