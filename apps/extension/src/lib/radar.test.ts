import { sourceDescriptors } from "@newsnext/client-source/metadata"
import { describe, expect, it } from "vitest"
import { createRadarMatcher, getRadarSuggestions } from "./radar"

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

  it("creates a reusable matcher from source metadata", () => {
    const matcher = createRadarMatcher(sourceDescriptors)

    expect(matcher.getSuggestions({ url: "https://x.com/newsnext_dev" })).toMatchObject([
      {
        sourceId: "x:user",
        title: "@newsnext_dev",
      },
    ])
  })

  it("sorts suggestions by confidence", () => {
    expect(getRadarSuggestions(
      { url: "https://example.com/a" },
      [
        {
          id: "test:low",
          radar: [
            {
              id: "low",
              match: { hosts: ["example.com"], paths: ["/a"] },
              params: { value: { type: "literal", value: "low" } },
              confidence: 0.1,
            },
          ],
        },
        {
          id: "test:high",
          radar: [
            {
              id: "high",
              match: { hosts: ["example.com"], paths: ["/a"] },
              params: { value: { type: "literal", value: "high" } },
              confidence: 0.9,
            },
          ],
        },
      ],
    ).map(suggestion => suggestion.sourceId)).toEqual(["test:high", "test:low"])
  })

  it("matches notIn values case-insensitively", () => {
    expect(getRadarSuggestions(
      { url: "https://x.com/Search" },
      [
        {
          id: "x:user",
          radar: [
            {
              id: "x-user",
              match: { hosts: ["x.com"], paths: ["/:username"] },
              params: {
                username: {
                  value: { type: "path", name: "username" },
                  notIn: ["search"],
                },
              },
            },
          ],
        },
      ],
    )).toEqual([])
  })

  it("keeps suggestions distinct when params contain objects", () => {
    expect(getRadarSuggestions(
      { url: "https://example.com/a" },
      [
        {
          id: "test:object",
          radar: [
            {
              id: "object",
              match: { hosts: ["example.com"], paths: ["/a"] },
              params: { value: { type: "literal", value: { b: 2, a: 1 } } },
            },
            {
              id: "object",
              match: { hosts: ["example.com"], paths: ["/a"] },
              params: { value: { type: "literal", value: { b: 3, a: 1 } } },
            },
          ],
        },
      ],
    )).toHaveLength(2)
  })

  it("ignores invalid matcher and validator patterns without throwing", () => {
    expect(getRadarSuggestions(
      { url: "https://example.com/a" },
      [
        {
          id: "test:invalid-path",
          radar: [
            {
              id: "invalid-path",
              match: { hosts: ["example.com"], paths: ["/*"] },
              params: { value: { type: "literal", value: "invalid-path" } },
            },
          ],
        },
        {
          id: "test:invalid-pattern",
          radar: [
            {
              id: "invalid-pattern",
              match: { hosts: ["example.com"], paths: ["/a"] },
              params: {
                value: {
                  value: { type: "literal", value: "invalid-pattern" },
                  pattern: "[",
                },
              },
            },
          ],
        },
      ],
    )).toEqual([])
  })
})
