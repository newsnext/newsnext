import bundledSourceRegistry from "@newsnext/registry" with { type: "json" }
import { resolveSources } from "@newsnext/registry/sources"
import { describe, expect, it } from "vitest"
import { createRadarMatcher, getRadarSuggestions } from "./matcher"
import { getRadarPageQueryKey } from "./page-query"

const sourceDescriptors = Object.entries(resolveSources(bundledSourceRegistry))
  .map(([id, source]) => {
    const { loader: _loader, ...descriptor } = source
    return { ...descriptor, id }
  })
function getSuggestions(...args: Parameters<typeof getRadarSuggestions>) {
  return getRadarSuggestions(args[0], args[1] ?? sourceDescriptors)
}

function selectPageField(select: string, value: string): Record<string, string> {
  return {
    [getRadarPageQueryKey({ select })]: value,
  }
}

describe("getRadarSuggestions", () => {
  it("suggests a GitHub Trending LiveCard with filters", () => {
    expect(getSuggestions({ url: "https://github.com/trending/typescript?since=weekly&spoken_language_code=zh" })).toMatchObject([
      {
        sourceId: "github:trending",
        patch: {
          params: {
            language: "typescript",
            spokenLanguage: "zh",
            dateRange: "weekly",
          },
          metadata: { title: "Trending typescript" },
        },
      },
    ])
  })

  it("uses parameter defaults when mapped URL values are missing", () => {
    expect(getSuggestions({
      url: "https://github.com/trending",
    })).toMatchObject([
      {
        sourceId: "github:trending",
        patch: {
          params: {
            language: "",
            spokenLanguage: "",
            dateRange: "daily",
          },
        },
      },
    ])
  })

  it("renders Radar parameters from URL Liquid variables", () => {
    expect(getRadarSuggestions(
      { url: "https://example.com/topics/path-value#/?value=hash-value" },
      [
        {
          id: "test:liquid-params",
          params: {
            value: {
              type: "text",
              title: "Value",
              default: "",
            },
          },
          radar: [
            {
              id: "liquid-params",
              match: {
                hosts: ["example.com"],
                paths: ["/topics/:topic"],
              },
              patch: {
                params: {
                  value: "{{ scope.query.value | default: scope.hashQuery.value | default: scope.path.topic }}",
                },
              },
            },
          ],
        },
      ],
    )).toMatchObject([
      {
        patch: { params: { value: "hash-value" } },
      },
    ])
  })

  it("renders Radar parameters from page JavaScript", () => {
    const script = () => "current-account"
    const matcher = createRadarMatcher([
      {
        id: "test:script-params",
        params: {
          identity: {
            type: "text",
            title: "Identity",
            default: "",
          },
        },
        radar: [
          {
            id: "script-params",
            match: { hosts: ["example.com"] },
            patch: { params: { identity: script } },
          },
        ],
      },
    ])
    const context = { url: "https://example.com/" }

    expect(matcher.getPageScripts(context)).toEqual([
      { key: "test:script-params:script-params:identity", script },
    ])
    expect(matcher.getSuggestions({
      ...context,
      pageScriptValues: {
        "test:script-params:script-params:identity": "current-account",
      },
    })).toMatchObject([
      { patch: { params: { identity: "current-account" } } },
    ])
  })

  it("exposes source vars to Radar parameter and metadata templates", () => {
    expect(getRadarSuggestions(
      { url: "https://example.com/topics/news" },
      [
        {
          id: "test:radar-context",
          vars: {
            prefix: "topic-",
            title: "Context title",
          },
          params: {
            value: {
              type: "text",
              title: "Value",
              default: "",
            },
          },
          radar: [
            {
              id: "radar-context",
              match: {
                hosts: ["example.com"],
                paths: ["/topics/:topic"],
              },
              patch: {
                params: {
                  value: "{{ source.vars.prefix }}{{ scope.path.topic }}",
                },
                metadata: {
                  title: "{{ source.vars.title }}: {{ scope.params.value }}",
                },
              },
            },
          ],
        },
      ],
    )).toMatchObject([
      {
        patch: {
          params: { value: "topic-news" },
          metadata: { title: "Context title: topic-news" },
        },
      },
    ])
  })

  it("extracts matching page CSS queries for Radar metadata", () => {
    const matcher = createRadarMatcher([
      {
        id: "test:page-query",
        radar: [
          {
            id: "page-query",
            match: {
              hosts: ["example.com"],
              paths: ["/users/:user"],
            },
            patch: {
              metadata: {
                badge: {
                  select: ".profile img",
                  attr: "src",
                  template: "{{ scope.value | absolute_url: scope.request.url }}",
                },
                desc: {
                  select: [".profile .bio", ".bio"],
                  template: "{{ scope.value }} · {{ scope.item.badge }}",
                },
              },
            },
          },
        ],
      },
    ])
    const context = { url: "https://example.com/users/newsnext" }
    const avatarQuery = { select: ".profile img", attr: "src" }
    const descQuery = { select: [".profile .bio", ".bio"] }

    expect(matcher.getPageQueries(context)).toEqual([avatarQuery, descQuery])
    expect(matcher.getSuggestions({
      ...context,
      pageSelections: {
        [getRadarPageQueryKey(avatarQuery)]: "/avatar.png",
        [getRadarPageQueryKey(descQuery)]: "A personalized news reader",
      },
    })).toMatchObject([
      {
        patch: {
          metadata: {
            badge: "https://example.com/avatar.png",
            desc: "A personalized news reader · /avatar.png",
          },
        },
      },
    ])
  })

  it("resolves all source metadata overrides", () => {
    expect(getRadarSuggestions(
      { url: "https://example.com/users/newsnext" },
      [
        {
          id: "test:user",
          baseUrl: "https://example.com/",
          params: {
            user: {
              type: "text",
              title: "User",
              default: "",
            },
          },
          radar: [
            {
              id: "user",
              match: {
                hosts: ["example.com"],
                paths: ["/users/:user"],
              },
              patch: {
                params: {
                  user: "{{ scope.path.user }}",
                },
                metadata: {
                  title: "User {{ scope.params.user }}",
                  badge: "/users/{{ scope.params.user }}.png",
                  desc: "Dynamic profile",
                  home: "/users/{{ scope.params.user }}",
                },
              },
            },
          ],
        },
      ],
    )).toMatchObject([
      {
        patch: {
          metadata: {
            title: "User newsnext",
            badge: "https://example.com/users/newsnext.png",
            desc: "Dynamic profile",
            home: "https://example.com/users/newsnext",
          },
        },
      },
    ])
  })

  it("does not infer same-named URL parameters without an explicit mapping", () => {
    expect(getRadarSuggestions(
      { url: "https://example.com/topics/url-value?value=query-value" },
      [
        {
          id: "test:explicit-params",
          params: {
            value: {
              type: "text",
              title: "Value",
              default: "default-value",
            },
          },
          radar: [
            {
              id: "explicit-params",
              match: {
                hosts: ["example.com"],
                paths: ["/topics/:value"],
              },
            },
          ],
        },
      ],
    )).toMatchObject([
      {
        patch: { params: { value: "default-value" } },
      },
    ])
  })

  it("suggests NetEase playlist and ranking LiveCards from hash route URLs", () => {
    expect(getSuggestions({
      url: "https://music.163.com/#/playlist?id=19723756",
      title: "飙升榜 - 歌单 - 网易云音乐",
    })).toMatchObject([
      {
        sourceId: "netease-music:playlist",
        patch: {
          params: { id: "19723756" },
          metadata: { title: "飙升榜" },
        },
      },
    ])

    expect(getSuggestions({
      url: "https://music.163.com/#/discover/toplist?id=71384707",
      title: "网易云古典榜 - 排行榜 - 网易云音乐",
    })).toMatchObject([
      {
        sourceId: "netease-music:ranking",
        patch: {
          params: { id: "71384707" },
          metadata: { title: "网易云古典榜" },
        },
      },
    ])

    expect(getSuggestions({
      url: "https://music.163.com/#/discover/toplist?id=71384707",
      title: "网易云音乐",
    })).toMatchObject([
      {
        sourceId: "netease-music:ranking",
        patch: {
          metadata: { title: "排行榜 71384707" },
        },
      },
    ])
  })

  it("does not treat hash routes as pathname matches", () => {
    expect(getRadarSuggestions(
      { url: "https://example.com/#/playlist?id=1" },
      [
        {
          id: "test:hash-path",
          radar: [
            {
              id: "hash-path",
              match: {
                hosts: ["example.com"],
                paths: ["/playlist"],
              },
            },
          ],
        },
      ],
    )).toEqual([])
  })

  it.each([
    ["all", "0"],
    ["anime", "13"],
    ["tech", "188"],
  ])("suggests a Bilibili ranking LiveCard for the %s route", (slug, region) => {
    const [suggestion] = getSuggestions({
      url: `https://www.bilibili.com/v/popular/rank/${slug}`,
      title: "哔哩哔哩排行榜",
    })

    expect(suggestion).toMatchObject({
      sourceId: "bilibili:ranking",
      patch: {
        params: { region },
      },
    })
  })

  it("suggests Folo feed and list LiveCards from timeline URLs", () => {
    expect(getSuggestions({
      url: "https://app.folo.is/timeline/articles/70006270320504832/pending",
      title: "AI News | Folo",
    })).toMatchObject([
      {
        sourceId: "folo:feed",
        patch: {
          params: {
            feedId: "70006270320504832",
          },
          metadata: {
            title: "AI News",
            home: "https://app.folo.is/timeline/articles/70006270320504832/pending",
          },
        },
      },
    ])

    expect(getSuggestions({
      url: "https://app.folo.is/timeline/articles/list-178752152055448576/pending",
      title: "Developer Reading | Folo",
    })).toMatchObject([
      {
        sourceId: "folo:list",
        patch: {
          params: {
            listId: "178752152055448576",
          },
          metadata: {
            title: "Developer Reading",
            home: "https://app.folo.is/timeline/articles/list-178752152055448576/pending",
          },
        },
      },
    ])

    expect(getSuggestions({
      url: "https://app.folo.is/timeline/articles/70006270320504832/1223093117926813696",
      title: "AI News | Folo",
    })).toMatchObject([
      {
        sourceId: "folo:feed",
        patch: {
          params: {
            feedId: "70006270320504832",
          },
          metadata: {
            title: "AI News",
            home: "https://app.folo.is/timeline/articles/70006270320504832/pending",
          },
        },
      },
    ])

    expect(getSuggestions({
      url: "https://app.folo.is/timeline/articles/list-68649150114432000/1223093117926813696",
      title: "Developer Reading | Folo",
    })).toMatchObject([
      {
        sourceId: "folo:list",
        patch: {
          params: {
            listId: "68649150114432000",
          },
          metadata: {
            title: "Developer Reading",
            home: "https://app.folo.is/timeline/articles/list-68649150114432000/pending",
          },
        },
      },
    ])
  })

  it("does not treat Folo aggregate and list routes as feeds", () => {
    const sources = sourceDescriptors.filter(source => source.id === "folo:feed")

    expect(getRadarSuggestions({
      url: "https://app.folo.is/timeline/articles/all/pending",
    }, sources)).toEqual([])
    expect(getRadarSuggestions({
      url: "https://app.folo.is/timeline/articles/list-178752152055448576/pending",
    }, sources)).toEqual([])
  })

  it("suggests a NewsNow parameterized LiveCard", () => {
    expect(getSuggestions({ url: "https://www.newsnow.com/us/Technology?type=ln" })).toMatchObject([
      {
        sourceId: "newsnow:topic-latest",
        patch: {
          params: { locale: "us", topic: "Technology" },
          metadata: { title: "Technology" },
        },
      },
    ])
  })

  it("suggests the matching parameterized Weibo hot search board", () => {
    expect(getSuggestions({
      url: "https://weibo.com/hot/acg",
      pageSelections: selectPageField("a[aria-current=\"page\"] [title]", "ACG"),
    })).toMatchObject([
      {
        sourceId: "weibo:hot-search",
        patch: {
          params: {
            type: "acg",
          },
          metadata: {
            title: "ACG",
            home: "https://weibo.com/hot/acg",
          },
        },
      },
    ])
  })

  it.each([
    [
      "https://www.reddit.com/user/NewsNext/submitted/",
      "reddit:user",
      { username: "NewsNext" },
      {
        home: "https://www.reddit.com/user/NewsNext/submitted/",
        title: "u/NewsNext",
      },
    ],
    [
      "https://old.reddit.com/r/typescript/comments/example/post/",
      "reddit:subreddit",
      { sort: "hot", subreddit: "typescript" },
      {
        home: "https://www.reddit.com/r/typescript/hot/",
        title: "r/typescript",
      },
    ],
  ])("suggests a Reddit LiveCard from %s", (url, sourceId, params, metadata) => {
    expect(getRadarSuggestions(
      { url },
      sourceDescriptors.filter(source => source.id === sourceId),
    )).toMatchObject([
      {
        sourceId,
        patch: {
          params,
          metadata,
        },
      },
    ])
  })

  it.each([
    ["best", "https://www.reddit.com/r/typescript/best/"],
    ["hot", "https://www.reddit.com/r/typescript/hot/"],
    ["new", "https://www.reddit.com/r/typescript/new/"],
    ["rising", "https://www.reddit.com/r/typescript/rising/"],
  ])("maps the Reddit %s page to the matching Subreddit sort", (sort, url) => {
    expect(getRadarSuggestions(
      { url },
      sourceDescriptors.filter(source => source.id === "reddit:subreddit"),
    )).toMatchObject([
      {
        sourceId: "reddit:subreddit",
        patch: {
          params: {
            sort,
            subreddit: "typescript",
          },
          metadata: {
            home: url,
            title: "r/typescript",
          },
        },
      },
    ])
  })

  it.each([
    ["https://www.reddit.com/r/typescript/top/?t=week", "week"],
    ["https://www.reddit.com/r/typescript/top/", "day"],
  ])("maps %s to the Reddit Subreddit Top source", (url, period) => {
    expect(getRadarSuggestions(
      { url },
      sourceDescriptors.filter(source => source.id === "reddit:subreddit-top"),
    )).toMatchObject([
      {
        sourceId: "reddit:subreddit-top",
        patch: {
          params: {
            period,
            subreddit: "typescript",
          },
          metadata: {
            home: `https://www.reddit.com/r/typescript/top/?t=${period}`,
            title: "r/typescript Top",
          },
        },
      },
    ])
  })

  it.each([
    ["https://x.com/NewsNext", "@NewsNext"],
    ["https://twitter.com/NewsNext/status/1234567890", "@NewsNext"],
  ])("suggests an X user LiveCard from %s", (url, title) => {
    expect(getRadarSuggestions(
      {
        url,
        pageSelections: selectPageField("[data-testid=\"UserName\"]", title),
      },
      sourceDescriptors.filter(source => source.id === "x:user"),
    )).toMatchObject([
      {
        sourceId: "x:user",
        patch: {
          params: { username: "NewsNext" },
          metadata: { title },
        },
      },
    ])
  })

  it("does not treat reserved X routes as user profiles", () => {
    expect(getRadarSuggestions(
      { url: "https://x.com/search" },
      sourceDescriptors.filter(source => source.id === "x:user"),
    )).toEqual([])
  })

  it("suggests a Jike user LiveCard from a profile root URL", () => {
    expect(getRadarSuggestions(
      {
        url: "https://web.okjike.com/u/ed00c4da-fb80-4072-a6d7-abf011bd30ea",
        pageSelections: selectPageField(
          "[class*=\"_nameRow_\"] a[aria-current=\"page\"]",
          "零山浅",
        ),
      },
      sourceDescriptors.filter(source => source.id === "jike:user-updates"),
    )).toMatchObject([
      {
        sourceId: "jike:user-updates",
        patch: {
          params: { username: "ed00c4da-fb80-4072-a6d7-abf011bd30ea" },
          metadata: { title: "零山浅" },
        },
      },
    ])
  })

  it.each([
    {
      path: "square",
      order: "recent",
    },
    {
      path: "selected",
      order: "hottest",
    },
  ])("suggests the matching Jike topic feed from /topic/:topicId/$path", ({
    path,
    order,
  }) => {
    expect(getRadarSuggestions(
      {
        url: `https://web.okjike.com/topic/5aeaa84029e4000011ac3768/${path}`,
        pageSelections: selectPageField(
          "[class*=\"_textGroup_\"] > [class*=\"_title_\"]",
          "即友日记本",
        ),
      },
      sourceDescriptors.filter(source => source.id === "jike:topic"),
    )).toMatchObject([
      {
        sourceId: "jike:topic",
        patch: {
          params: {
            topicId: "5aeaa84029e4000011ac3768",
            order,
          },
          metadata: {
            title: "即友日记本",
          },
        },
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
      [{ id: "missing:source" }],
    )).toEqual([])

    expect(getRadarSuggestions(
      { url: "https://github.com/trending/typescript?since=weekly&spoken_language_code=en" },
      sourceDescriptors.filter(source => source.id === "github:trending"),
    )).toMatchObject([
      {
        sourceId: "github:trending",
        patch: {
          params: { language: "typescript", dateRange: "weekly", spokenLanguage: "en" },
          metadata: { title: "Trending typescript" },
        },
      },
    ])
  })

  it("creates a default origin radar rule for sources without params or radar", () => {
    expect(getRadarSuggestions(
      { url: "https://example.com/articles/one" },
      [{
        id: "test:default",
        metadata: {
          home: "https://www.example.com/feed",
        },
      }],
    )).toMatchObject([
      {
        confidence: 0,
        ruleId: "default-home-origin",
        sourceId: "test:default",
        patch: { params: {} },
      },
    ])
  })

  it("does not create a default radar rule for parameterized sources or explicit radar configs", () => {
    expect(getRadarSuggestions(
      { url: "https://example.com/articles/one" },
      [
        {
          id: "test:parameterized",
          metadata: {
            home: "https://example.com",
          },
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
          metadata: {
            home: "https://example.com",
          },
          radar: [],
        },
        {
          id: "test:explicit",
          metadata: {
            home: "https://example.com",
          },
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
        { id: "test:invalid-home", metadata: { home: "not a url" } },
        { id: "test:extension-home", metadata: { home: "chrome-extension://example/page.html" } },
      ],
    )).toEqual([])
  })

  it("creates a reusable matcher from source metadata", () => {
    const matcher = createRadarMatcher(sourceDescriptors)

    expect(matcher.getSuggestions({ url: "https://github.com/trending/typescript?since=weekly&spoken_language_code=en" })).toMatchObject([
      {
        sourceId: "github:trending",
        patch: {
          params: { language: "typescript", dateRange: "weekly", spokenLanguage: "en" },
          metadata: { title: "Trending typescript" },
        },
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

  it("prioritizes explicit path rules over generated origin rules", () => {
    expect(getRadarSuggestions(
      { url: "https://example.com/ranking" },
      [
        {
          id: "test:generic-one",
          metadata: {
            home: "https://example.com",
          },
        },
        {
          id: "test:generic-two",
          metadata: {
            home: "https://example.com/feed",
          },
        },
        {
          id: "test:ranking",
          radar: [
            {
              id: "ranking",
              match: { hosts: ["example.com"], paths: ["/ranking"] },
            },
          ],
        },
      ],
    ).map(suggestion => ({
      confidence: suggestion.confidence,
      sourceId: suggestion.sourceId,
    }))).toEqual([
      { confidence: 1, sourceId: "test:ranking" },
      { confidence: 0, sourceId: "test:generic-one" },
      { confidence: 0, sourceId: "test:generic-two" },
    ])
  })

  it("excludes matching paths before resolving suggestions", () => {
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
            },
          },
          radar: [
            {
              id: "x-user",
              match: {
                hosts: ["x.com"],
                paths: {
                  include: ["/:username"],
                  exclude: ["/search"],
                },
              },
              patch: {
                params: {
                  username: "{{ scope.path.username }}",
                },
              },
            },
          ],
        },
      ],
    )).toEqual([])
  })

  it("matches path regexes and exposes named captures", () => {
    expect(getRadarSuggestions(
      { url: "https://example.com/users/newsnext" },
      [
        {
          id: "test:regex-path",
          params: {
            username: {
              type: "text",
              title: "Username",
              default: "",
            },
          },
          radar: [
            {
              id: "regex-path",
              match: {
                hosts: ["example.com"],
                paths: {
                  include: [{ regex: "/users/(?<username>[^/?#]+)$" }],
                },
              },
              patch: {
                params: {
                  username: "{{ scope.path.username }}",
                },
              },
            },
          ],
        },
      ],
    )).toMatchObject([
      {
        patch: {
          params: {
            username: "newsnext",
          },
        },
      },
    ])
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
                params: { value: "one" },
              },
            },
            {
              id: "object",
              match: { hosts: ["example.com"], paths: ["/a"] },
              patch: {
                params: { value: "two" },
              },
            },
          ],
        },
      ],
    )).toHaveLength(2)
  })

  it("ignores invalid matcher patterns without throwing", () => {
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
      ],
    )).toEqual([])
  })
})
