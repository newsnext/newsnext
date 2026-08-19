import { describe, expect, it } from "vitest"
import { dynamicItemsToNewsItems, followingDynamicItemsToNewsItems } from "./dynamics"
import { favoriteMediaToNewsItem } from "./favorites"
import { pgcRankingItemToNewsItem, videoRankingItemToNewsItem } from "./ranking"
import {
  getBilibiliSearchDateRange,
  searchVideoItemToNewsItem,
} from "./search"
import {
  parseBilibiliCount,
  parseBilibiliDisplayDate,
  parseBilibiliOpusTimestamp,
} from "./shared"
import {
  upAudioItemToNewsItem,
  upOpusItemToNewsItem,
  upVideoItemToNewsItem,
} from "./up"
import { signBilibiliWbiParams } from "./wbi"

describe("bilibili search", () => {
  it("resolves preset and custom date ranges in Shanghai time", () => {
    const now = Date.parse("2026-08-19T12:00:00+08:00")
    expect(getBilibiliSearchDateRange("week", "", "", now)).toEqual({
      begin: Date.parse("2026-08-13T00:00:00+08:00") / 1000,
      end: Date.parse("2026-08-19T23:59:59+08:00") / 1000,
    })
    expect(getBilibiliSearchDateRange("custom", "2026-08-01", "2026-08-03")).toEqual({
      begin: Date.parse("2026-08-01T00:00:00+08:00") / 1000,
      end: Date.parse("2026-08-03T23:59:59+08:00") / 1000,
    })
    expect(getBilibiliSearchDateRange("custom", "2026-08-03", "2026-08-01")).toEqual({
      begin: Date.parse("2026-08-03T00:00:00+08:00") / 1000,
      end: Date.parse("2026-08-01T23:59:59+08:00") / 1000,
    })
  })

  it("maps highlighted video results", () => {
    expect(searchVideoItemToNewsItem({
      author: "NewsNext",
      bvid: "BV1test",
      danmaku: 12,
      favorites: 34,
      mid: 42,
      pic: "//i0.hdslb.com/test.jpg",
      play: "1.2万",
      pubdate: 1_700_000_000,
      title: "<em class=\"keyword\">News</em>Next",
      upic: "http://i0.hdslb.com/avatar.jpg",
    })).toEqual(expect.objectContaining({
      title: "NewsNext",
      url: "https://www.bilibili.com/video/BV1test",
      publishedAt: 1_700_000_000_000,
      stats: { stars: 34, views: 12_000 },
      attributes: { danmaku: 12 },
    }))
  })
})

describe("bilibili video items", () => {
  it("maps favorites and uses the selected ordering timestamp", () => {
    const media = {
      bvid: "BV1favorite",
      cnt_info: { collect: 20, play: 100 },
      cover: "http://example.com/cover.jpg",
      fav_time: 2_000,
      intro: "Example intro",
      pubtime: 1_000,
      title: "Example favorite",
      upper: {
        face: "http://example.com/face.jpg",
        mid: 1,
        name: "Example UP",
      },
    }

    expect(favoriteMediaToNewsItem(media, "mtime")).toEqual(expect.objectContaining({
      title: "Example favorite",
      url: "https://www.bilibili.com/video/BV1favorite",
      publishedAt: undefined,
      updatedAt: 2_000_000,
      author: { home: "https://space.bilibili.com/1", name: "Example UP" },
      stats: { stars: 20, views: 100 },
      content: { pictures: "https://example.com/cover.jpg", text: "Example intro" },
    }))
    expect(favoriteMediaToNewsItem(media, "view")?.publishedAt).toBe(1_000_000)
    expect(favoriteMediaToNewsItem(media, "view")?.updatedAt).toBeUndefined()
    expect(favoriteMediaToNewsItem(media, "pubtime")?.publishedAt).toBe(1_000_000)
    expect(favoriteMediaToNewsItem({ title: "Unavailable" }, "mtime")).toBeNull()
  })

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
    const items = followingDynamicItemsToNewsItems([
      dynamicVideo("Older", "BV1older", 1_000),
      { modules: { module_dynamic: { major: null } } },
      dynamicVideo("Newest", "BV1newest", 3_000),
      dynamicVideo("Middle", "BV1middle", 2_000),
    ], "video")

    expect(items.map(item => item.title)).toEqual(["Newest", "Middle", "Older"])
  })

  it("filters following dynamics by selected content", () => {
    const dynamics = [
      dynamicVideo("Video", "BV1video", 3_000),
      {
        id_str: "picture",
        type: "DYNAMIC_TYPE_DRAW",
        modules: {
          module_author: { face: "https://example.com/avatar.jpg", name: "Example UP", pub_ts: 2_000 },
          module_dynamic: {
            major: {
              type: "MAJOR_TYPE_OPUS",
              opus: { summary: { text: "Picture post" } },
            },
          },
        },
      },
      {
        id_str: "live",
        type: "DYNAMIC_TYPE_LIVE_RCMD",
        modules: {
          module_author: { pub_ts: 4_000 },
          module_dynamic: { desc: { text: "Live recommendation" } },
        },
      },
      {
        id_str: "pgc",
        type: "DYNAMIC_TYPE_PGC_UNION",
        modules: {
          module_author: {
            jump_url: "//bangumi.bilibili.com/anime/1",
            name: "Example series",
            pub_time: "2026年08月15日",
            pub_ts: "0",
          },
          module_dynamic: {
            major: {
              type: "MAJOR_TYPE_PGC",
              pgc: {
                badge: { text: "国创" },
                cover: "http://example.com/pgc.jpg",
                jump_url: "https://www.bilibili.com/bangumi/play/ep1",
                stat: { play: "12.3万" },
                title: "Example episode",
              },
            },
          },
        },
      },
    ]

    expect(followingDynamicItemsToNewsItems(dynamics, "all").map(item => item.title))
      .toEqual(["Video", "Picture post"])
    expect(followingDynamicItemsToNewsItems(dynamics, "video").map(item => item.title))
      .toEqual(["Video"])
    expect(followingDynamicItemsToNewsItems(dynamics, "article").map(item => item.title))
      .toEqual(["Picture post"])
    expect(followingDynamicItemsToNewsItems(dynamics, "pgc"))
      .toEqual([
        expect.objectContaining({
          title: "Example episode",
          url: "https://www.bilibili.com/bangumi/play/ep1",
          publishedAt: Date.UTC(2026, 7, 14, 16),
          author: expect.objectContaining({ home: "https://bangumi.bilibili.com/anime/1" }),
          stats: expect.objectContaining({ views: 123_000 }),
          attributes: { type: "国创" },
          content: expect.objectContaining({ pictures: "https://example.com/pgc.jpg" }),
        }),
      ])
    expect(followingDynamicItemsToNewsItems(dynamics, "article")[0]?.icon)
      .toEqual({
        kind: "author",
        label: "Example UP",
        src: "https://example.com/avatar.jpg",
      })
  })

  it("keeps all supported item types in a user dynamic feed", () => {
    const dynamics = [
      dynamicVideo("Video", "BV1video", 2_000),
      {
        id_str: "forward",
        type: "DYNAMIC_TYPE_FORWARD",
        modules: {
          module_author: { pub_ts: 3_000 },
          module_dynamic: { desc: { text: "Forward comment" } },
        },
        orig: {
          modules: {
            module_dynamic: { desc: { text: "Original post" } },
          },
        },
      },
    ]

    expect(dynamicItemsToNewsItems(dynamics)).toEqual([
      expect.objectContaining({
        title: "Forward comment",
        url: "https://www.bilibili.com/opus/forward",
        content: { text: "Forward comment\n\nOriginal post" },
      }),
      expect.objectContaining({ title: "Video" }),
    ])
  })

  it("maps independent UP video, opus, and audio items", () => {
    expect(upVideoItemToNewsItem({
      author: "Example UP",
      bvid: "BV1video",
      comment: 3,
      created: 1_000,
      mid: 1,
      pic: "http://example.com/video.jpg",
      play: "12.3万",
      title: "Example video",
    })).toEqual(expect.objectContaining({
      title: "Example video",
      url: "https://www.bilibili.com/video/BV1video",
      publishedAt: 1_000_000,
      stats: { comments: 3, views: 123_000 },
    }))

    expect(upOpusItemToNewsItem({
      content: "Example picture post",
      cover: { url: "http://example.com/picture.jpg" },
      jump_url: "//www.bilibili.com/opus/200",
      opus_id: "200",
      stat: { like: "2.5万", view: "100" },
    })).toEqual(expect.objectContaining({
      title: "Example picture post",
      url: "https://www.bilibili.com/opus/200",
      stats: { likes: 25_000, views: 100 },
      content: expect.objectContaining({ pictures: "https://example.com/picture.jpg" }),
    }))

    expect(upAudioItemToNewsItem({
      cover: "http://example.com/audio.jpg",
      id: 300,
      passtime: 2_000,
      statistic: { collect: 4, comment: 3, play: 1, share: 2 },
      title: "Example audio",
      uid: 1,
      uname: "Example UP",
    })).toEqual(expect.objectContaining({
      title: "Example audio",
      url: "https://www.bilibili.com/audio/au300",
      publishedAt: 2_000_000,
      stats: { comments: 3, reposts: 2, stars: 4, views: 1 },
    }))
  })
})

describe("bilibili WBI signing", () => {
  it("matches the published signing vector", async () => {
    const params = await signBilibiliWbiParams(
      { foo: 114, bar: 514, zab: 1_919_810 },
      "https://i0.hdslb.com/bfs/wbi/7cd084941338484aae1ad9425b84077c.png",
      "https://i0.hdslb.com/bfs/wbi/4932caff0ff746eab6f01bf08b70ac45.png",
      1_702_204_169,
    )

    expect(params).toBe("bar=514&foo=114&wts=1702204169&zab=1919810&w_rid=8f6f2b5b3d485fe1886cec6a0be8c5d4")
  })
})

function dynamicVideo(title: string, bvid: string, publishedAt: number) {
  return {
    id_str: bvid,
    type: "DYNAMIC_TYPE_AV",
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

describe("parseBilibiliDisplayDate", () => {
  const now = Date.UTC(2026, 0, 2, 12)

  it.each([
    ["2025年12月31日", Date.UTC(2025, 11, 30, 16)],
    ["12月31日", Date.UTC(2025, 11, 30, 16)],
    ["01月02日", Date.UTC(2026, 0, 1, 16)],
    ["02月30日", undefined],
    [undefined, undefined],
  ])("parses %s as the most recent China Standard Time date", (value, expected) => {
    expect(parseBilibiliDisplayDate(value, now)).toBe(expected)
  })
})

describe("parseBilibiliOpusTimestamp", () => {
  it.each([
    ["1238135244941426689", Date.UTC(2026, 7, 19, 4, 37, 6)],
    ["invalid", undefined],
    [undefined, undefined],
  ])("decodes %s", (value, expected) => {
    expect(parseBilibiliOpusTimestamp(value)).toBe(expected)
  })
})
