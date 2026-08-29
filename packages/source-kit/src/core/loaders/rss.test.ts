import { describe, expect, it } from "vitest"
import { parseRss } from "./rss"

describe("parseRss", () => {
  it("extracts RSS channel metadata", () => {
    expect(parseRss(`
      <rss version="2.0">
        <channel>
          <title>阮一峰的网络日志</title>
          <description>Technology articles and notes</description>
          <link>https://www.ruanyifeng.com/blog/</link>
          <image>
            <url>/feed-icon.png</url>
          </image>
          <item>
            <title>Latest article</title>
            <link>https://www.ruanyifeng.com/blog/2026/07/example.html</link>
            <pubDate>Fri, 24 Jul 2026 08:12:16 +0800</pubDate>
          </item>
        </channel>
      </rss>
    `)).toEqual({
      items: [{
        title: "Latest article",
        url: "https://www.ruanyifeng.com/blog/2026/07/example.html",
        publishedAt: 1784851936000,
      }],
      metadata: {
        badge: "/feed-icon.png",
        desc: "Technology articles and notes",
        home: "https://www.ruanyifeng.com/blog/",
        title: "阮一峰的网络日志",
      },
    })
  })

  it("extracts the Atom feed title", () => {
    expect(parseRss(`
      <feed xmlns="http://www.w3.org/2005/Atom">
        <title>Example Atom Feed</title>
        <subtitle>Example Atom description</subtitle>
        <link rel="self" href="https://example.com/feed.xml" />
        <link rel="alternate" href="https://example.com/" />
        <entry>
          <title>Latest entry</title>
          <link href="https://example.com/entry" />
          <updated>2026-07-24T00:12:16Z</updated>
        </entry>
      </feed>
    `)).toMatchObject({
      items: [{
        title: "Latest entry",
        url: "https://example.com/entry",
        updatedAt: 1784851936000,
      }],
      metadata: {
        desc: "Example Atom description",
        home: "https://example.com/",
        title: "Example Atom Feed",
      },
    })
  })

  it("decodes HTML entities preserved inside XML CDATA", () => {
    expect(parseRss(`
      <rss version="2.0">
        <channel>
          <title><![CDATA[AI &amp; Technology]]></title>
          <description><![CDATA[News about &quot;AI&quot;]]></description>
          <item>
            <title><![CDATA[Launch &quot;Project Star&quot;]]></title>
            <link>https://example.com/project-star</link>
          </item>
        </channel>
      </rss>
    `)).toEqual({
      items: [{
        title: "Launch \"Project Star\"",
        url: "https://example.com/project-star",
      }],
      metadata: {
        desc: "News about \"AI\"",
        title: "AI & Technology",
      },
    })
  })

  it("preserves publication and update timestamps independently", () => {
    expect(parseRss(`
      <feed xmlns="http://www.w3.org/2005/Atom">
        <entry>
          <title>Newer publication</title>
          <link href="https://example.com/newer" />
          <published>2026-07-24T00:00:00Z</published>
          <updated>2026-07-25T00:00:00Z</updated>
        </entry>
        <entry>
          <title>Older publication</title>
          <link href="https://example.com/older" />
          <published>2026-07-23T00:00:00Z</published>
          <updated>2026-07-26T00:00:00Z</updated>
        </entry>
      </feed>
    `)?.items).toEqual([
      {
        title: "Newer publication",
        url: "https://example.com/newer",
        publishedAt: 1784851200000,
        updatedAt: 1784937600000,
      },
      {
        title: "Older publication",
        url: "https://example.com/older",
        publishedAt: 1784764800000,
        updatedAt: 1785024000000,
      },
    ])
  })

  it("preserves timestamps without changing feed order", () => {
    expect(parseRss(`
      <feed xmlns="http://www.w3.org/2005/Atom">
        <entry>
          <title>Recently updated</title>
          <link href="https://example.com/recently-updated" />
          <published>2026-07-23T00:00:00Z</published>
          <updated>2026-07-26T00:00:00Z</updated>
        </entry>
        <entry>
          <title>Previously updated</title>
          <link href="https://example.com/previously-updated" />
          <published>2026-07-24T00:00:00Z</published>
          <updated>2026-07-25T00:00:00Z</updated>
        </entry>
      </feed>
    `)?.items).toEqual([
      {
        title: "Recently updated",
        url: "https://example.com/recently-updated",
        publishedAt: 1784764800000,
        updatedAt: 1785024000000,
      },
      {
        title: "Previously updated",
        url: "https://example.com/previously-updated",
        publishedAt: 1784851200000,
        updatedAt: 1784937600000,
      },
    ])
  })

  it("retains timestamps when feed order expresses a different ranking", () => {
    expect(parseRss(`
      <feed xmlns="http://www.w3.org/2005/Atom">
        <entry>
          <title>First ranked entry</title>
          <link href="https://example.com/first" />
          <published>2026-07-23T00:00:00Z</published>
          <updated>2026-07-25T00:00:00Z</updated>
        </entry>
        <entry>
          <title>Second ranked entry</title>
          <link href="https://example.com/second" />
          <published>2026-07-24T00:00:00Z</published>
          <updated>2026-07-26T00:00:00Z</updated>
        </entry>
      </feed>
    `)?.items).toEqual([
      {
        title: "First ranked entry",
        url: "https://example.com/first",
        publishedAt: 1784764800000,
        updatedAt: 1784937600000,
      },
      {
        title: "Second ranked entry",
        url: "https://example.com/second",
        publishedAt: 1784851200000,
        updatedAt: 1785024000000,
      },
    ])
  })

  it("filters invalid entries and omits invalid timestamps", () => {
    expect(parseRss(`
      <rss version="2.0">
        <channel>
          <item>
            <title>Valid article</title>
            <link>https://example.com/valid</link>
            <pubDate>not a date</pubDate>
          </item>
          <item>
            <title>Missing link</title>
          </item>
        </channel>
      </rss>
    `)?.items).toEqual([{
      title: "Valid article",
      url: "https://example.com/valid",
    }])
  })

  it("uses the feed home and guid when an RSS item has no link", () => {
    expect(parseRss(`
      <rss version="2.0">
        <channel>
          <link>https://example.com/news</link>
          <item>
            <title>Linkless flash</title>
            <link />
            <guid isPermaLink="false">flash:index:123</guid>
          </item>
          <item>
            <title>Linkless item without a guid</title>
          </item>
        </channel>
      </rss>
    `)?.items).toEqual([
      {
        title: "Linkless flash",
        url: "https://example.com/news#guid=flash%3Aindex%3A123",
      },
      {
        title: "Linkless item without a guid",
        url: "https://example.com/news",
      },
    ])
  })

  it("extracts JSON Feed metadata, authors, and publication timestamps", () => {
    expect(parseRss(JSON.stringify({
      version: "https://jsonfeed.org/version/1.1",
      title: "Example JSON Feed",
      description: "Example description",
      home_page_url: "https://example.com/",
      icon: "/icon.png",
      items: [{
        id: "1",
        url: "https://example.com/newer",
        title: "Newer item",
        date_published: "2026-07-24T00:00:00Z",
        authors: [{ name: "Ada", avatar: "/ada.png" }],
      }, {
        id: "2",
        external_url: "https://example.com/older",
        title: "Older item",
        date_published: "2026-07-23T00:00:00Z",
      }],
    }))).toEqual({
      items: [{
        title: "Newer item",
        url: "https://example.com/newer",
        publishedAt: 1784851200000,
        author: { name: "Ada" },
        icon: { kind: "author", label: "Ada", src: "/ada.png" },
      }, {
        title: "Older item",
        url: "https://example.com/older",
        publishedAt: 1784764800000,
      }],
      metadata: {
        badge: "/icon.png",
        desc: "Example description",
        home: "https://example.com/",
        title: "Example JSON Feed",
      },
    })
  })

  it("derives JSON Feed titles and accepts an HTTP item id as its URL", () => {
    expect(parseRss(JSON.stringify({
      version: "https://jsonfeed.org/version/1",
      title: "Example JSON Feed",
      items: [{
        id: "https://example.com/text",
        content_text: `  ${"word ".repeat(60)}  `,
      }, {
        id: "2",
        url: "https://example.com/html",
        content_html: "<p>Hello <strong>from HTML</strong></p>",
      }],
    }))?.items).toEqual([{
      title: `${"word ".repeat(39)}word…`,
      url: "https://example.com/text",
      content: { text: "word ".repeat(60).trim() },
    }, {
      title: "Hello from HTML",
      url: "https://example.com/html",
      content: { html: "<p>Hello <strong>from HTML</strong></p>" },
    }])
  })

  it("rejects unsupported JSON versions and uses the JSON Feed home as a fallback URL", () => {
    expect(parseRss(JSON.stringify({
      version: "https://jsonfeed.org/version/2",
      title: "Future feed",
      items: [],
    }))).toBeUndefined()

    expect(parseRss(JSON.stringify({
      version: "https://jsonfeed.org/version/1.1",
      title: "Example feed",
      home_page_url: "https://example.com/",
      items: [
        { id: "urn:uuid:1", title: "No item URL" },
        { id: "2", url: "https://example.com/valid", summary: "Valid item" },
      ],
    }))?.items).toEqual([
      {
        title: "No item URL",
        url: "https://example.com/#guid=urn%3Auuid%3A1",
      },
      {
        title: "Valid item",
        url: "https://example.com/valid",
        content: { text: "Valid item" },
      },
    ])
  })
})
