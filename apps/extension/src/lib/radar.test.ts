import { sourceDescriptors } from "@newsnext/client-source/metadata"
import { describe, expect, it } from "vitest"
import { getRadarSuggestions } from "./radar"

function getSuggestions(...args: Parameters<typeof getRadarSuggestions>) {
  return getRadarSuggestions(args[0], args[1] ?? sourceDescriptors)
}

describe("getRadarSuggestions", () => {
  it("suggests an X user card from a profile URL", () => {
    expect(getSuggestions({ url: "https://x.com/newsnext_dev/status/1" })).toMatchObject([
      {
        sourceId: "x:user",
        params: { username: "newsnext_dev" },
      },
    ])
  })

  it("ignores X reserved routes", () => {
    expect(getSuggestions({ url: "https://x.com/search?q=news" })).toEqual([])
  })

  it("suggests a GitHub Trending card with filters", () => {
    expect(getSuggestions({ url: "https://github.com/trending/typescript?since=weekly&spoken_language_code=zh" })).toMatchObject([
      {
        sourceId: "github:trending",
        params: {
          language: "typescript",
          spokenLanguage: "zh",
          dateRange: "weekly",
        },
      },
    ])
  })

  it("suggests a NetEase playlist card from hash route URLs", () => {
    expect(getSuggestions({
      url: "https://music.163.com/#/playlist?id=19723756",
      title: "飙升榜 - 歌单 - 网易云音乐",
    })).toMatchObject([
      {
        sourceId: "netease-music:playlist",
        title: "飙升榜",
        params: { id: "19723756" },
      },
    ])

    expect(getSuggestions({
      url: "https://music.163.com/#/discover/toplist?id=71384707",
      title: "网易云古典榜 - 排行榜 - 网易云音乐",
    })).toMatchObject([
      {
        sourceId: "netease-music:playlist",
        title: "网易云古典榜",
        params: { id: "71384707" },
      },
    ])

    expect(getSuggestions({
      url: "https://music.163.com/#/discover/toplist?id=71384707",
      title: "网易云音乐",
    })).toMatchObject([
      {
        sourceId: "netease-music:playlist",
        title: "Playlist 71384707",
      },
    ])
  })

  it("suggests Weibo cards from user, keyword, and super topic URLs", () => {
    expect(getSuggestions({
      url: "https://m.weibo.cn/u/1195230310",
      title: "少数派的微博_微博",
    })).toMatchObject([
      {
        sourceId: "weibo:user",
        title: "少数派",
        params: { uid: "1195230310" },
      },
    ])

    expect(getSuggestions({
      url: "https://m.weibo.cn/u/123456",
      title: "@阿兰工作室 的个人主页",
    })).toMatchObject([
      {
        sourceId: "weibo:user",
        title: "阿兰工作室",
        params: { uid: "123456" },
      },
    ])

    expect(getSuggestions({ url: "https://s.weibo.com/weibo?q=React" })).toMatchObject([
      {
        sourceId: "weibo:keyword",
        params: { keyword: "React" },
      },
    ])

    expect(getSuggestions({
      url: "https://m.weibo.cn/p/index?containerid=1008084989d223732bf6f02f75ea30efad58a9",
      title: "React超话-微博",
    })).toMatchObject([
      {
        sourceId: "weibo:super-topic",
        title: "React",
        params: {
          id: "1008084989d223732bf6f02f75ea30efad58a9",
          type: "feed",
        },
      },
    ])
  })

  it("suggests Jike cards from user and topic URLs", () => {
    expect(getSuggestions({
      url: "https://web.okjike.com/u/lijigang",
      title: "李继刚的主页 - 即刻",
    })).toMatchObject([
      {
        sourceId: "jike:user-updates",
        title: "李继刚",
        params: { username: "lijigang" },
      },
    ])

    expect(getSuggestions({
      url: "https://web.okjike.com/u/2FEA4ABE-39F7-49F2-8AFD-4A5A39902D75/post/6a4c9b7bc704301bc51dffef",
      title: "王紫君Zima：泡泡",
    })).toMatchObject([
      {
        sourceId: "jike:user-updates",
        title: "王紫君Zima",
        params: { username: "2FEA4ABE-39F7-49F2-8AFD-4A5A39902D75" },
      },
    ])

    expect(getSuggestions({
      url: "https://web.okjike.com/topic/5aeaa84029e4000011ac3768",
      title: "AI探索站 - 即刻",
    })).toMatchObject([
      {
        sourceId: "jike:topic-recent",
        title: "AI探索站",
        params: { topicId: "5aeaa84029e4000011ac3768" },
      },
      {
        sourceId: "jike:topic-hottest",
        title: "AI探索站",
        params: { topicId: "5aeaa84029e4000011ac3768" },
      },
    ])
  })

  it("suggests V2EX and NewsNow parameterized cards", () => {
    expect(getSuggestions({
      url: "https://v2ex.com/go/share",
      title: "V2EX › 分享发现",
    })).toMatchObject([
      {
        sourceId: "v2ex:feed",
        title: "分享发现",
        params: { feed: "share" },
      },
    ])

    expect(getSuggestions({ url: "https://www.newsnow.com/us/Technology?type=ln" })).toMatchObject([
      {
        sourceId: "newsnow:topic-latest",
        params: { locale: "us", topic: "Technology" },
      },
    ])
  })

  it("returns no suggestions for invalid or unknown URLs", () => {
    expect(getSuggestions({ url: "not a url" })).toEqual([])
    expect(getSuggestions({ url: "https://example.com/article" })).toEqual([])
  })

  it("filters suggestions by available source metadata", () => {
    expect(getRadarSuggestions(
      { url: "https://x.com/newsnext_dev" },
      [{ id: "weibo:user" }],
    )).toEqual([])

    expect(getRadarSuggestions(
      { url: "https://x.com/newsnext_dev" },
      sourceDescriptors.filter(source => source.id === "x:user"),
    )).toMatchObject([
      {
        sourceId: "x:user",
        title: "@newsnext_dev",
      },
    ])
  })
})
