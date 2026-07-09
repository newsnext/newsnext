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
        paramsPatch: { username: "newsnext_dev" },
        metaPatch: { title: "@newsnext_dev" },
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
        paramsPatch: {
          language: "typescript",
          spokenLanguage: "zh",
          dateRange: "weekly",
        },
        metaPatch: { title: "Trending typescript" },
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
        paramsPatch: { id: "19723756" },
        metaPatch: { title: "飙升榜" },
      },
    ])

    expect(getSuggestions({
      url: "https://music.163.com/#/discover/toplist?id=71384707",
      title: "网易云古典榜 - 排行榜 - 网易云音乐",
    })).toMatchObject([
      {
        sourceId: "netease-music:playlist",
        paramsPatch: { id: "71384707" },
        metaPatch: { title: "网易云古典榜" },
      },
    ])

    expect(getSuggestions({
      url: "https://music.163.com/#/discover/toplist?id=71384707",
      title: "网易云音乐",
    })).toMatchObject([
      {
        sourceId: "netease-music:playlist",
        metaPatch: { title: "Playlist 71384707" },
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
        paramsPatch: { uid: "1195230310" },
        metaPatch: { title: "少数派" },
      },
    ])

    expect(getSuggestions({
      url: "https://m.weibo.cn/u/123456",
      title: "@阿兰工作室 的个人主页",
    })).toMatchObject([
      {
        sourceId: "weibo:user",
        paramsPatch: { uid: "123456" },
        metaPatch: { title: "阿兰工作室" },
      },
    ])

    expect(getSuggestions({ url: "https://s.weibo.com/weibo?q=React" })).toMatchObject([
      {
        sourceId: "weibo:keyword",
        paramsPatch: { keyword: "React" },
        metaPatch: { title: "React" },
      },
    ])

    expect(getSuggestions({
      url: "https://m.weibo.cn/p/index?containerid=1008084989d223732bf6f02f75ea30efad58a9",
      title: "React超话-微博",
    })).toMatchObject([
      {
        sourceId: "weibo:super-topic",
        paramsPatch: {
          id: "1008084989d223732bf6f02f75ea30efad58a9",
          type: "feed",
        },
        metaPatch: { title: "React" },
      },
    ])
  })

  it("suggests Jike cards from user and topic URLs", () => {
    expect(getSuggestions({
      url: "https://web.okjike.com/following",
      title: "Following - 即刻",
    })).toMatchObject([
      {
        sourceId: "jike:following-updates",
        paramsPatch: {},
      },
    ])

    expect(getSuggestions({
      url: "https://web.okjike.com/u/lijigang",
      title: "李继刚的主页 - 即刻",
    })).toMatchObject([
      {
        sourceId: "jike:user-updates",
        paramsPatch: { username: "lijigang" },
        metaPatch: { title: "李继刚" },
      },
    ])

    expect(getSuggestions({
      url: "https://web.okjike.com/u/2FEA4ABE-39F7-49F2-8AFD-4A5A39902D75/post/6a4c9b7bc704301bc51dffef",
      title: "王紫君Zima：泡泡",
    })).toMatchObject([
      {
        sourceId: "jike:user-updates",
        paramsPatch: { username: "2FEA4ABE-39F7-49F2-8AFD-4A5A39902D75" },
        metaPatch: { title: "王紫君Zima" },
      },
    ])

    expect(getSuggestions({
      url: "https://web.okjike.com/topic/5aeaa84029e4000011ac3768",
      title: "AI探索站 - 即刻",
    })).toMatchObject([
      {
        sourceId: "jike:topic-recent",
        paramsPatch: { topicId: "5aeaa84029e4000011ac3768" },
        metaPatch: { title: "AI探索站" },
      },
      {
        sourceId: "jike:topic-hottest",
        paramsPatch: { topicId: "5aeaa84029e4000011ac3768" },
        metaPatch: { title: "AI探索站" },
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
        paramsPatch: { feed: "share" },
        metaPatch: { title: "分享发现" },
      },
    ])

    expect(getSuggestions({ url: "https://www.newsnow.com/us/Technology?type=ln" })).toMatchObject([
      {
        sourceId: "newsnow:topic-latest",
        paramsPatch: { locale: "us", topic: "Technology" },
        metaPatch: { title: "Technology" },
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
        paramsPatch: { username: "newsnext_dev" },
        metaPatch: { title: "@newsnext_dev" },
      },
    ])
  })

  it("creates a reusable matcher from source metadata", () => {
    const matcher = createRadarMatcher(sourceDescriptors)

    expect(matcher.getSuggestions({ url: "https://x.com/newsnext_dev" })).toMatchObject([
      {
        sourceId: "x:user",
        paramsPatch: { username: "newsnext_dev" },
        metaPatch: { title: "@newsnext_dev" },
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
          params: {
            username: {
              type: "text",
              title: "Username",
              default: "elonmusk",
              notIn: ["search"],
            },
          },
          radar: [
            {
              id: "x-user",
              match: { hosts: ["x.com"], paths: ["/:username"] },
            },
          ],
        },
      ],
    )).toEqual([])
  })

  it("keeps suggestions distinct when params patches differ", () => {
    expect(getRadarSuggestions(
      { url: "https://example.com/a" },
      [
        {
          id: "test:object",
          params: {
            value: {
              type: "text",
              title: "Value",
              default: "",
            },
          },
          radar: [
            {
              id: "object",
              match: { hosts: ["example.com"], paths: ["/a"] },
              paramsPatch: { value: { type: "literal", value: "one" } },
            },
            {
              id: "object",
              match: { hosts: ["example.com"], paths: ["/a"] },
              paramsPatch: { value: { type: "literal", value: "two" } },
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
            },
          ],
        },
        {
          id: "test:invalid-pattern",
          params: {
            value: {
              type: "text",
              title: "Value",
              default: "",
              pattern: "[",
            },
          },
          radar: [
            {
              id: "invalid-pattern",
              match: { hosts: ["example.com"], paths: ["/a"] },
              paramsPatch: { value: { type: "literal", value: "invalid-pattern" } },
            },
          ],
        },
      ],
    )).toEqual([])
  })
})
