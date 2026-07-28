import { describe, expect, it } from "vitest"
import {
  getBilibiliRankingRequest,
  pgcRankingItemToNewsItem,
  videoRankingItemToNewsItem,
} from "./bilibili"

describe("bilibili ranking", () => {
  it.each([
    ["0", "video", "https://api.bilibili.com/x/web-interface/ranking/v2", { rid: 0, type: "all" }],
    ["1", "video", "https://api.bilibili.com/x/web-interface/ranking/v2", { rid: 1005, type: "all" }],
    ["188", "video", "https://api.bilibili.com/x/web-interface/ranking/v2", { rid: 1012, type: "all" }],
    ["13", "pgc", "https://api.bilibili.com/pgc/web/rank/list", { day: 3, season_type: 1 }],
    ["167", "pgc", "https://api.bilibili.com/pgc/season/rank/web/list", { day: 3, season_type: 4 }],
  ])("maps region %s to its official request", (region, kind, url, query) => {
    expect(getBilibiliRankingRequest(region)).toEqual({ kind, query, url })
  })

  it("normalizes a video ranking item", () => {
    expect(videoRankingItemToNewsItem({
      bvid: "BV123",
      desc: "Description",
      owner: {
        face: "http://example.com/avatar.jpg",
        name: "UP 主",
      },
      pic: "http://example.com/cover.jpg",
      pubdate: 1_700_000_000,
      stat: {
        like: 20,
        view: 100,
      },
      title: "Video",
    })).toEqual({
      inline: {
        icon: {
          radius: 4,
          src: "https://example.com/avatar.jpg",
        },
        text: "UP 主 · 100 播放 · 20 点赞",
      },
      preview: {
        picture: "https://example.com/cover.jpg",
        text: "Description",
      },
      timestamp: 1_700_000_000_000,
      title: "Video",
      url: "https://www.bilibili.com/video/BV123",
    })
  })

  it("normalizes a PGC ranking item", () => {
    expect(pgcRankingItemToNewsItem({
      cover: "http://example.com/cover.jpg",
      icon_font: {
        text: "1.6亿",
      },
      new_ep: {
        index_show: "更新至第45话",
      },
      rating: "9.8分",
      season_id: 109700,
      title: "番剧",
    })).toEqual({
      inline: {
        text: "更新至第45话 · 9.8分 · 1.6亿 播放",
      },
      preview: {
        picture: "https://example.com/cover.jpg",
        text: "更新至第45话",
      },
      title: "番剧",
      url: "https://www.bilibili.com/bangumi/play/ss109700",
    })
  })
})
