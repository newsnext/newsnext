import { describe, expect, it } from "vitest"
import {
  dynamicFeedItemsToNewsItems,
  parseBilibiliCount,
  pgcRankingItemToNewsItem,
  videoRankingItemToNewsItem,
} from "./bilibili"

describe("bilibili video items", () => {
  it("maps all supported ranking counters to shared stats", () => {
    expect(videoRankingItemToNewsItem({
      bvid: "BV1example",
      title: "Example video",
      stat: {
        favorite: 5,
        like: 2,
        reply: 3,
        share: 4,
        view: 1,
      },
    })).toEqual(expect.objectContaining({
      stats: {
        likes: 2,
        comments: 3,
        reposts: 4,
        views: 1,
        stars: 5,
      },
    }))
  })

  it("keeps formatted PGC views in shared stats", () => {
    const item = pgcRankingItemToNewsItem({
      icon_font: { text: "12.3万观看" },
      season_id: 1,
      title: "Example series",
    })

    expect(item).toEqual(expect.objectContaining({
      stats: { views: 123_000 },
    }))
    expect(item?.attributes).not.toHaveProperty("views")
  })

  it("restores chronological order after flattening folded video groups", () => {
    const items = dynamicFeedItemsToNewsItems([
      dynamicVideo("Older", "BV1older", 1_000),
      { modules: { module_dynamic: { major: null } } },
      dynamicVideo("Newest", "BV1newest", 3_000),
      dynamicVideo("Middle", "BV1middle", 2_000),
    ])

    expect(items.map(item => item.title)).toEqual(["Newest", "Middle", "Older"])
  })
})

function dynamicVideo(title: string, bvid: string, publishedAt: number) {
  return {
    modules: {
      module_author: { pub_ts: publishedAt },
      module_dynamic: {
        major: {
          archive: { bvid, title },
        },
      },
    },
  }
}

describe("parseBilibiliCount", () => {
  it.each([
    ["123", 123],
    ["12.3万观看", 123_000],
    ["1.2亿", 120_000_000],
    [undefined, undefined],
  ])("parses %s", (value, expected) => {
    expect(parseBilibiliCount(value)).toBe(expected)
  })
})
