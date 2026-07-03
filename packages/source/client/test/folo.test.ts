import { describe, expect, it } from "vitest"
import { foloEntriesToNewsItems } from "../src/lib/folo"

describe("folo source", () => {
  it("maps Folo entry responses to news items", () => {
    const items = foloEntriesToNewsItems([
      {
        entries: {
          title: "First item",
          url: "https://example.com/first",
          description: "Fallback preview",
          summary: "Summary preview",
          author: "Ada",
          publishedAt: "2026-06-27T13:18:40.772Z",
          media: [
            { type: "photo", url: "https://example.com/image.png" },
            { type: "video", url: "https://example.com/video.mp4" },
          ],
          categories: ["Updates"],
        },
        feeds: {
          title: "Example Feed",
          image: "https://example.com/icon.png",
        },
      },
      {
        entries: {
          title: "Missing URL",
        },
      },
    ])

    expect(items).toEqual([
      {
        title: "First item",
        url: "https://example.com/first",
        timestamp: 1782566320772,
        inline: {
          text: "Ada",
        },
        preview: {
          text: "Summary preview",
          picture: ["https://example.com/image.png"],
        },
      },
    ])
  })
})
