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
        link: "https://www.ruanyifeng.com/blog/2026/07/example.html",
        created: "Fri, 24 Jul 2026 08:12:16 +0800",
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
        link: "https://example.com/entry",
      }],
      metadata: {
        desc: "Example Atom description",
        home: "https://example.com/",
        title: "Example Atom Feed",
      },
    })
  })
})
