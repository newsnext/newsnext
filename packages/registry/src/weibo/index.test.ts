import type { NewsItem } from "@newsnext/source/types"
import { resolveProvider } from "@newsnext/source/registry"
import { myFetch } from "@newsnext/source/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import weiboProvider from "./index"

vi.mock("@newsnext/source/utils", () => ({
  myFetch: vi.fn(),
}))

describe("weibo hot search source", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("loads realtime topics while excluding ads and the pinned government topic", async () => {
    vi.mocked(myFetch).mockResolvedValue({
      ok: 1,
      data: {
        hotgov: {
          name: "#Pinned topic#",
          note: "#Pinned topic#",
          url: "http://weibo.com/123/example",
          icon: "https://simg.s.weibo.com/hot.png",
          icon_desc: "Hot",
        },
        realtime: [
          {
            note: "Trending topic",
            word: "Trending topic",
            word_scheme: "#Trending topic#",
            num: 1172636,
            icon: "https://simg.s.weibo.com/new.png",
            realpos: 1,
          },
          {
            is_ad: 1,
            note: "Sponsored topic",
            word: "Sponsored topic",
            num: 535019,
            realpos: 2,
          },
        ],
      },
    })

    const source = resolveProvider("weibo", weiboProvider).sources["hot-search"]
    const results = await source.loader({ type: "search" })

    expect(results).toEqual<NewsItem[]>([
      {
        title: "Trending topic",
        url: "https://s.weibo.com/weibo?q=%23Trending%20topic%23",
        inline: {
          mark: {
            src: "https://simg.s.weibo.com/new.png",
            scale: 1.5,
            radius: 0,
          },
        },
      },
    ])
  })

  it("loads categorized topics while excluding ads and unranked promotions", async () => {
    vi.mocked(myFetch).mockResolvedValue({
      ok: 1,
      data: {
        band_list: [
          {
            note: "Technology topic",
            word_scheme: "#Technology topic#",
            num: 246810,
            rank: 0,
            icon_url: "https://simg.s.weibo.com/new.png",
          },
          {
            note: "Sponsored topic",
            word_scheme: "Sponsored topic",
            num: 123456,
            rank: 1,
            is_ad: 1,
          },
          {
            note: "Unranked promotion",
            word_scheme: "Unranked promotion",
            rank: null,
          },
        ],
      },
    })

    const source = resolveProvider("weibo", weiboProvider).sources["hot-search"]
    const results = await source.loader({ type: "tech" })

    expect(results).toEqual<NewsItem[]>([
      {
        title: "Technology topic",
        url: "https://s.weibo.com/weibo?q=%23Technology%20topic%23",
        inline: {
          mark: {
            src: "https://simg.s.weibo.com/new.png",
            scale: 1.5,
            radius: 0,
          },
        },
      },
    ])
    expect(myFetch).toHaveBeenCalledWith(
      "https://weibo.com/ajax/statuses/technology",
      { credentials: "include" },
    )
  })

  it("loads the personalized ranked topics", async () => {
    vi.mocked(myFetch).mockResolvedValue({
      ok: 1,
      data: {
        realtime: [
          {
            word: "Personalized topic",
            word_scheme: "Personalized topic",
            description: "Recently topped",
            rank: 0,
          },
          {
            word: "Personalized promotion",
            rank: null,
          },
        ],
      },
    })

    const source = resolveProvider("weibo", weiboProvider).sources["hot-search"]
    const results = await source.loader({ type: "mine" })

    expect(results).toEqual<NewsItem[]>([
      {
        title: "Personalized topic",
        url: "https://s.weibo.com/weibo?q=Personalized%20topic",
      },
    ])
  })

  it.each([
    ["search", "side/hotSearch"],
    ["mine", "statuses/mineBand"],
    ["entertainment", "statuses/entertainment"],
    ["social", "statuses/social"],
    ["tech", "statuses/technology"],
    ["life", "statuses/life"],
    ["sports", "statuses/sport"],
    ["acg", "statuses/acg"],
  ] as const)("maps %s to its API endpoint", async (type, endpoint) => {
    vi.mocked(myFetch).mockResolvedValue({
      data: {
        realtime: [],
      },
    })

    const source = resolveProvider("weibo", weiboProvider).sources["hot-search"]
    await source.loader({ type })

    expect(myFetch).toHaveBeenCalledWith(
      `https://weibo.com/ajax/${endpoint}`,
      { credentials: "include" },
    )
  })

  it("requests access to Weibo image hosts", () => {
    const sources = resolveProvider("weibo", weiboProvider).sources

    for (const source of Object.values(sources)) {
      expect(source.capabilities.network).toContain("*.sinaimg.cn")
    }
    expect(sources.keyword.capabilities.network).toContain("m.weibo.cn")
    expect(sources["hot-search"].requestRules).toEqual([
      expect.objectContaining({
        action: {
          type: "modifyHeaders",
          requestHeaders: [
            {
              header: "Referer",
              operation: "set",
              value: "https://weibo.com/",
            },
          ],
        },
        condition: expect.objectContaining({
          requestDomains: ["weibo.com", "sinaimg.cn"],
        }),
      }),
    ])
  })
})
