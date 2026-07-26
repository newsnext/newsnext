import { sourceDescriptors } from "@newsnext/source/metadata"
import { describe, expect, it } from "vitest"
import { createRadarMatcher, getRadarSuggestions } from "./radar"

function getSuggestions(...args: Parameters<typeof getRadarSuggestions>) {
  return getRadarSuggestions(args[0], args[1] ?? sourceDescriptors)
}

describe("getRadarSuggestions", () => {
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

  it("uses parameter defaults when mapped URL values are missing", () => {
    expect(getSuggestions({
      url: "https://github.com/trending",
    })).toMatchObject([
      {
        sourceId: "github:trending",
        paramsPatch: {
          language: "",
          spokenLanguage: "",
          dateRange: "daily",
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
      { url: "https://github.com/trending/typescript?since=weekly&spoken_language_code=en" },
      [{ id: "v2ex:feed" }],
    )).toEqual([])

    expect(getRadarSuggestions(
      { url: "https://github.com/trending/typescript?since=weekly&spoken_language_code=en" },
      sourceDescriptors.filter(source => source.id === "github:trending"),
    )).toMatchObject([
      {
        sourceId: "github:trending",
        paramsPatch: { language: "typescript", dateRange: "weekly", spokenLanguage: "en" },
        metaPatch: { title: "Trending typescript" },
      },
    ])
  })

  it("creates a default origin radar rule for sources without params or radar", () => {
    expect(getRadarSuggestions(
      { url: "https://example.com/articles/one" },
      [{
        id: "test:default",
        home: "https://www.example.com/feed",
      }],
    )).toMatchObject([
      {
        ruleId: "default-home-origin",
        sourceId: "test:default",
        paramsPatch: {},
      },
    ])
  })

  it("does not create a default radar rule for parameterized sources or explicit radar configs", () => {
    expect(getRadarSuggestions(
      { url: "https://example.com/articles/one" },
      [
        {
          id: "test:parameterized",
          home: "https://example.com",
          params: {
            topic: {
              type: "text",
              title: "Topic",
              default: "news",
            },
          },
        },
        {
          id: "test:disabled",
          home: "https://example.com",
          radar: [],
        },
        {
          id: "test:explicit",
          home: "https://example.com",
          radar: [
            {
              id: "other-path",
              match: { hosts: ["example.com"], paths: ["/other"] },
            },
          ],
        },
      ],
    )).toEqual([])
  })

  it("ignores invalid and non-web home URLs when creating default radar rules", () => {
    expect(getRadarSuggestions(
      { url: "https://example.com/articles/one" },
      [
        { id: "test:invalid-home", home: "not a url" },
        { id: "test:extension-home", home: "chrome-extension://example/page.html" },
      ],
    )).toEqual([])
  })

  it("creates a reusable matcher from source metadata", () => {
    const matcher = createRadarMatcher(sourceDescriptors)

    expect(matcher.getSuggestions({ url: "https://github.com/trending/typescript?since=weekly&spoken_language_code=en" })).toMatchObject([
      {
        sourceId: "github:trending",
        paramsPatch: { language: "typescript", dateRange: "weekly", spokenLanguage: "en" },
        metaPatch: { title: "Trending typescript" },
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
              patch: {
                params: { value: { type: "literal", value: "one" } },
              },
            },
            {
              id: "object",
              match: { hosts: ["example.com"], paths: ["/a"] },
              patch: {
                params: { value: { type: "literal", value: "two" } },
              },
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
              patch: {
                params: { value: { type: "literal", value: "invalid-pattern" } },
              },
            },
          ],
        },
      ],
    )).toEqual([])
  })
})
