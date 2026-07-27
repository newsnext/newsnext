import { myFetch } from "@newsnext/source/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  fetchWeiboFollowingTimeline,
  fetchWeiboKeywordPosts,
  fetchWeiboSuperTopicPosts,
  fetchWeiboUserPosts,
} from "./utils"

vi.mock("@newsnext/source/utils", () => ({
  myFetch: vi.fn(),
}))

const desktopStatus = {
  id: "1234567890",
  mblogid: "ExampleBid",
  text_raw: "Desktop Weibo post",
  created_at: "Sun Jul 26 12:00:00 +0800 2026",
  source: "<a href=\"https://weibo.com\">Weibo Web</a>",
  user: {
    id: "42",
    profile_image_url: "https://tvax1.sinaimg.cn/avatar.jpg",
  },
  pic_infos: {
    first: {
      large: {
        url: "https://wx1.sinaimg.cn/large/example.jpg",
      },
    },
  },
}

describe("weibo desktop loaders", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("loads a user timeline from the desktop API", async () => {
    vi.mocked(myFetch).mockResolvedValue({
      ok: 1,
      data: {
        list: [desktopStatus, { ...desktopStatus, isAd: true }],
      },
    })

    await expect(fetchWeiboUserPosts({ uid: "42" })).resolves.toEqual([
      expect.objectContaining({
        title: "Desktop Weibo post",
        url: "https://weibo.com/42/ExampleBid",
        preview: {
          text: "Desktop Weibo post",
          picture: ["https://wx1.sinaimg.cn/large/example.jpg"],
        },
      }),
    ])
    expect(myFetch).toHaveBeenCalledWith(
      "https://weibo.com/ajax/statuses/mymblog?uid=42&page=1&feature=0",
      {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "include",
      },
    )
  })

  it("loads keyword results from the mobile JSON API", async () => {
    vi.mocked(myFetch).mockResolvedValue({
      data: {
        cards: [
          {
            mblog: {
              ...desktopStatus,
              mblogid: undefined,
              bid: "MobileBid",
              text_raw: undefined,
              text: "<p>Mobile keyword result</p>",
            },
          },
        ],
      },
    })

    const results = await fetchWeiboKeywordPosts({ keyword: "News Next" })

    expect(results).toEqual([
      expect.objectContaining({
        title: "Mobile keyword result",
        url: "https://weibo.com/42/MobileBid",
      }),
    ])
    expect(myFetch).toHaveBeenCalledWith(
      "https://m.weibo.cn/api/container/getIndex?containerid=100103type%3D61%26q%3DNews%20Next%26t%3D0",
      {
        headers: {
          "MWeibo-Pwa": "1",
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "include",
      },
    )
  })

  it("loads super-topic feed items from the desktop API", async () => {
    vi.mocked(myFetch).mockResolvedValue({
      items: [
        { category: "card", data: desktopStatus },
        { category: "feed", data: desktopStatus },
      ],
    })

    const results = await fetchWeiboSuperTopicPosts({
      id: "100808abcdef",
      type: "feed",
    })

    expect(results).toHaveLength(1)
    expect(myFetch).toHaveBeenCalledWith(
      "https://weibo.com/ajax_proxy/chaohua/page?flowId=100808abcdef_-_feed",
      expect.objectContaining({ credentials: "include" }),
    )
  })

  it("loads the following timeline without a separate login probe", async () => {
    vi.mocked(myFetch).mockResolvedValue({ statuses: [desktopStatus] })

    const results = await fetchWeiboFollowingTimeline()

    expect(results).toHaveLength(1)
    expect(myFetch).toHaveBeenCalledTimes(1)
    expect(myFetch).toHaveBeenCalledWith(
      "https://weibo.com/ajax/feed/friendstimeline?list_id=my_follow_all&refresh=4&since_id=0&count=25",
      expect.objectContaining({ credentials: "include" }),
    )
  })

  it("reports login from the following timeline response", async () => {
    vi.mocked(myFetch).mockResolvedValue({
      ok: -100,
      url: "https://weibo.com/login.php?url=https%3A%2F%2Fweibo.com%2F",
    })

    await expect(fetchWeiboFollowingTimeline()).rejects.toThrow(
      "Please log in to https://weibo.com first.",
    )
  })
})
