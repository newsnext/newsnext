import { myFetch } from "@newsnext/source/utils/fetch"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  fetchWeiboFollowingTimeline,
  fetchWeiboKeywordPosts,
  fetchWeiboSuperTopicPosts,
  fetchWeiboUserPosts,
} from "./utils"

vi.mock("@newsnext/source/utils/fetch", () => ({
  myFetch: vi.fn(),
}))

describe("weibo utils", () => {
  beforeEach(() => {
    vi.mocked(myFetch).mockReset()
  })

  it("rejects Weibo profile URLs as user post params", async () => {
    await expect(fetchWeiboUserPosts({ uid: "https://m.weibo.cn/u/1195230310" })).rejects.toThrow("Weibo user ID must be a numeric uid.")
    expect(myFetch).not.toHaveBeenCalled()
  })

  it("rejects Weibo super topic URLs as super topic params", async () => {
    await expect(fetchWeiboSuperTopicPosts({
      id: "https://m.weibo.cn/p/index?containerid=1008084989d223732bf6f02f75ea30efad58a9_-_feed",
      type: "feed",
    })).rejects.toThrow("Weibo super topic ID must start with 100808")
    expect(myFetch).not.toHaveBeenCalled()
  })

  it("loads posts for a specified user through the mobile container API", async () => {
    vi.mocked(myFetch)
      .mockResolvedValueOnce({
        ok: 1,
        data: {
          tabsInfo: {
            tabs: [
              { tab_type: "profile", containerid: "profile-container" },
              { tab_type: "weibo", containerid: "weibo-container" },
            ],
          },
        },
      })
      .mockResolvedValueOnce({
        ok: 1,
        data: {
          cards: [
            {
              mblog: {
                bid: "PostBid",
                text: "Hello <a>world</a>",
                created_at: "2026-07-04T12:00:00.000Z",
                source: "iPhone",
                user: {
                  id: "1195230310",
                  screen_name: "Weibo User",
                  profile_image_url: "https://example.com/avatar.jpg",
                },
                pics: [
                  {
                    large: {
                      url: "https://example.com/pic.jpg",
                    },
                  },
                ],
              },
            },
          ],
        },
      })

    const items = await fetchWeiboUserPosts({ uid: "1195230310" })

    expect(myFetch).toHaveBeenNthCalledWith(
      1,
      "https://m.weibo.cn/api/container/getIndex?type=uid&value=1195230310",
      expect.objectContaining({
        headers: expect.objectContaining({
          Referer: "https://m.weibo.cn/u/1195230310",
        }),
      }),
    )
    expect(myFetch).toHaveBeenNthCalledWith(
      2,
      "https://m.weibo.cn/api/container/getIndex?type=uid&value=1195230310&containerid=weibo-container",
      expect.any(Object),
    )
    expect(items).toEqual([
      {
        title: "Hello world",
        url: "https://m.weibo.cn/1195230310/PostBid",
        mobileUrl: "https://m.weibo.cn/status/PostBid",
        timestamp: 1783166400000,
        inline: {
          text: "iPhone",
          icon: {
            src: "https://example.com/avatar.jpg",
            radius: 999,
          },
        },
        preview: {
          text: "Hello world",
          picture: ["https://example.com/pic.jpg"],
        },
      },
    ])
  })

  it("loads following timeline with injected Weibo cookies", async () => {
    vi.mocked(myFetch)
      .mockResolvedValueOnce({
        ok: 1,
        data: {
          uid: "1195230310",
        },
      })
      .mockResolvedValueOnce({
        ok: 1,
        data: {
          statuses: [
            {
              bid: "TimelineBid",
              text: "Timeline update",
              created_at: "2026-07-04T11:00:00.000Z",
              user: {
                id: "42",
                screen_name: "Followed",
              },
            },
          ],
        },
      })

    const items = await fetchWeiboFollowingTimeline({}, {
      secrets: {
        sub: "sub-value",
        subp: "subp-value",
        ssoLoginState: "state-value",
      },
    })

    expect(myFetch).toHaveBeenNthCalledWith(
      1,
      "https://m.weibo.cn/api/config",
      expect.objectContaining({
        headers: expect.objectContaining({
          Cookie: "SUB=sub-value; SUBP=subp-value; SSOLoginState=state-value",
        }),
      }),
    )
    expect(myFetch).toHaveBeenNthCalledWith(
      2,
      "https://m.weibo.cn/feed/friends",
      expect.objectContaining({
        headers: expect.objectContaining({
          Referer: "https://m.weibo.cn/u/1195230310",
        }),
      }),
    )
    expect(items[0]).toMatchObject({
      title: "Timeline update",
      url: "https://m.weibo.cn/42/TimelineBid",
    })
  })

  it("loads keyword posts through the mobile search container", async () => {
    vi.mocked(myFetch).mockResolvedValueOnce({
      ok: 1,
      data: {
        cards: [
          {
            mblog: {
              bid: "KeywordBid",
              text: "Keyword hit",
              created_at: "2026-07-04T10:00:00.000Z",
              user: {
                id: "43",
                screen_name: "Searcher",
              },
            },
          },
        ],
      },
    })

    const items = await fetchWeiboKeywordPosts({ keyword: "AI news" })

    expect(myFetch).toHaveBeenCalledWith(
      "https://m.weibo.cn/api/container/getIndex?containerid=100103type%3D61%26q%3DAI%20news%26t%3D0",
      expect.objectContaining({
        headers: expect.objectContaining({
          Referer: "https://m.weibo.cn/p/searchall?containerid=100103type%3D1%26q%3DAI%20news",
        }),
      }),
    )
    expect(items[0]).toMatchObject({
      title: "Keyword hit",
      url: "https://m.weibo.cn/43/KeywordBid",
    })
  })

  it("loads super topic posts and flattens nested card groups", async () => {
    vi.mocked(myFetch).mockResolvedValueOnce({
      ok: 1,
      data: {
        cards: [
          {
            card_group: [
              {
                card_type: 9,
                mblog: {
                  bid: "TopicBid",
                  text: "Topic update",
                  created_at: "2026-07-04T09:00:00.000Z",
                  user: {
                    id: "44",
                    screen_name: "TopicUser",
                  },
                },
              },
            ],
          },
        ],
      },
    })

    const items = await fetchWeiboSuperTopicPosts({
      id: "1008084989d223732bf6f02f75ea30efad58a9",
      type: "sort_time",
    })

    expect(myFetch).toHaveBeenCalledWith(
      "https://m.weibo.cn/api/container/getIndex?containerid=1008084989d223732bf6f02f75ea30efad58a9_-_sort_time&luicode=10000011&lfid=1008084989d223732bf6f02f75ea30efad58a9_-_main",
      expect.objectContaining({
        headers: expect.objectContaining({
          Referer: "https://m.weibo.cn/p/index?containerid=1008084989d223732bf6f02f75ea30efad58a9_-_soul&luicode=10000011&lfid=1008084989d223732bf6f02f75ea30efad58a9_-_main",
        }),
      }),
    )
    expect(items[0]).toMatchObject({
      title: "Topic update",
      url: "https://m.weibo.cn/44/TopicBid",
    })
  })
})
