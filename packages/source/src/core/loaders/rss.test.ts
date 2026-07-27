import { beforeEach, describe, expect, it, vi } from "vitest"
import { myFetch } from "../../utils"
import { loadRss } from "./rss"

vi.mock("../../utils", () => ({
  myFetch: vi.fn(),
}))

describe("rss loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("loads RSS channel items", async () => {
    vi.mocked(myFetch).mockResolvedValue(`
      <rss>
        <channel>
          <item>
            <title>Example story</title>
            <link>https://example.com/story</link>
            <pubDate>2026-07-27T10:00:00Z</pubDate>
          </item>
        </channel>
      </rss>
    `)

    await expect(loadRss({ url: "https://example.com/feed.xml" })).resolves.toEqual([
      {
        title: "Example story",
        url: "https://example.com/story",
        timestamp: Date.parse("2026-07-27T10:00:00Z"),
      },
    ])
  })

  it("loads Atom entries", async () => {
    vi.mocked(myFetch).mockResolvedValue(`
      <feed>
        <entry>
          <title>Atom story</title>
          <link href="https://example.com/atom-story" />
          <updated>2026-07-27T11:00:00Z</updated>
        </entry>
      </feed>
    `)

    await expect(loadRss({ url: "https://example.com/feed.atom" })).resolves.toEqual([
      {
        title: "Atom story",
        url: "https://example.com/atom-story",
        timestamp: Date.parse("2026-07-27T11:00:00Z"),
      },
    ])
  })
})
