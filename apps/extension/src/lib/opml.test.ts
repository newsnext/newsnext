import { describe, expect, it } from "vitest"
import { parseOpml } from "./opml"

describe("parseOpml", () => {
  it("reads the document title and nested feeds", () => {
    expect(parseOpml(`<?xml version="1.0"?>
      <opml version="2.0">
        <head><title>Design feeds</title></head>
        <body>
          <outline text="News">
            <outline text="Example" xmlUrl="https://example.com/feed.xml" />
            <outline title="Updates" xmlUrl="https://updates.example.com/rss" />
          </outline>
        </body>
      </opml>`)).toEqual({
      title: "Design feeds",
      feeds: [
        { title: "Example", url: "https://example.com/feed.xml" },
        { title: "Updates", url: "https://updates.example.com/rss" },
      ],
    })
  })

  it("deduplicates feed URLs while preserving their first title", () => {
    const imported = parseOpml(`<opml><head><title>Reading</title></head><body>
      <outline text="First" xmlUrl="https://example.com/feed" />
      <outline text="Second" xmlUrl="https://example.com/feed" />
    </body></opml>`)

    expect(imported.feeds).toEqual([
      { title: "First", url: "https://example.com/feed" },
    ])
  })

  it("rejects documents without a title or feeds", () => {
    expect(() => parseOpml("<opml><head/><body/></opml>"))
      .toThrow("does not have a title")
    expect(() => parseOpml("<opml><head><title>Empty</title></head><body/></opml>"))
      .toThrow("does not contain any RSS feeds")
  })

  it("rejects malformed XML and unsafe feed URLs", () => {
    expect(() => parseOpml("<opml>"))
      .toThrow("not valid XML")
    expect(() => parseOpml(`<opml><head><title>Feeds</title></head><body>
      <outline xmlUrl="file:///tmp/feed.xml" />
    </body></opml>`)).toThrow("invalid feed URL")
  })
})
