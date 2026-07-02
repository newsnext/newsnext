import { myFetch } from "@newsnext/source-shared/utils/fetch"
import { beforeEach, describe, expect, it, vi } from "vitest"
import jikeProvider, { fetchJikeFollowingUpdates, fetchJikeTopicHottestFeed, fetchJikeTopicRecentFeed, fetchJikeUserUpdates, jikePostsToNewsItems } from "../src/lib/jike"

vi.mock("@newsnext/source-shared/utils/fetch", () => ({
  myFetch: vi.fn(),
}))

interface MockChromeGlobal {
  chrome: {
    runtime: Record<string, never>
    tabs: {
      query: ReturnType<typeof vi.fn>
    }
    scripting: {
      executeScript: ReturnType<typeof vi.fn>
    }
  }
}

describe("jike source", () => {
  beforeEach(() => {
    vi.mocked(myFetch).mockReset()
    Object.assign(globalThis, {
      chrome: {
        runtime: {},
        tabs: {
          query: vi.fn((_queryInfo, callback) => {
            callback?.([{ id: 42 }])
          }),
        },
        scripting: {
          executeScript: vi.fn((_injection, callback) => {
            callback?.([{ result: " jike-token " }])
          }),
        },
      },
    })
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn(() => undefined),
      },
    })
  })

  it("registers following updates as a timeline source", () => {
    expect(jikeProvider.sources["following-updates"]).toMatchObject({
      title: "Following updates",
      type: "timeline",
      home: "https://web.okjike.com",
    })
    expect(jikeProvider.sources["following-updates"].params).toBeUndefined()
  })

  it("registers topic feeds with topic params", () => {
    expect(jikeProvider.sources["topic-recent"]).toMatchObject({
      title: "Topic recent",
      type: "timeline",
      home: "https://web.okjike.com",
    })
    expect(jikeProvider.sources["topic-hottest"]).toMatchObject({
      title: "Topic hottest",
      type: "hottest",
      home: "https://web.okjike.com",
    })
    expect(jikeProvider.sources["topic-recent"].params).toMatchObject({
      topicId: {
        title: "Topic ID",
        default: "5aeaa84029e4000011ac3768",
      },
    })
    expect(jikeProvider.sources["topic-hottest"].params).toMatchObject({
      topicId: {
        title: "Topic ID",
        default: "5aeaa84029e4000011ac3768",
      },
    })
  })

  it("registers user updates with a username param", () => {
    expect(jikeProvider.sources["user-updates"]).toMatchObject({
      title: "User updates",
      type: "timeline",
      home: "https://web.okjike.com",
    })
    expect(jikeProvider.sources["user-updates"].params).toMatchObject({
      username: {
        title: "Username",
        default: "a2d6acc1-626f-4d15-a22a-849e88a4c9f0",
      },
    })
  })

  it("loads following updates through the logged-in Jike session", async () => {
    vi.mocked(myFetch).mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: "6a464f3e54aae0885e15bd28",
          type: "ORIGINAL_POST",
          content: "A fresh update",
          actionTime: "2026-07-02T11:45:02.000Z",
          likeCount: 7,
          commentCount: 2,
          topic: {
            content: "AI",
          },
          pictures: [
            {
              middlePicUrl: "https://cdnv2.ruguoapp.com/picture.jpg",
            },
          ],
          user: {
            screenName: "NewsNext",
            profileImageUrl: "https://cdnv2.ruguoapp.com/avatar.jpg",
          },
        },
      ],
    })

    const items = await fetchJikeFollowingUpdates()
    const extensionGlobal = globalThis as typeof globalThis & MockChromeGlobal

    expect(extensionGlobal.chrome.tabs.query).toHaveBeenCalledWith(
      { url: "https://web.okjike.com/*" },
      expect.any(Function),
    )
    expect(extensionGlobal.chrome.scripting.executeScript).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { tabId: 42 },
        args: ["JK_ACCESS_TOKEN"],
      }),
      expect.any(Function),
    )
    expect(myFetch).toHaveBeenCalledWith(
      "https://api.ruguoapp.com/1.0/personalUpdate/followingUpdates",
      expect.objectContaining({
        credentials: "include",
        method: "POST",
        headers: expect.objectContaining({
          "platform": "web",
          "x-jike-access-token": "jike-token",
        }),
        body: {
          limit: 50,
        },
      }),
    )
    expect(items).toEqual([
      {
        title: "A fresh update",
        url: "https://m.okjike.com/originalPosts/6a464f3e54aae0885e15bd28",
        timestamp: 1782992702000,
        inline: {
          text: "NewsNext · #AI · 7 likes · 2 comments",
          icon: {
            src: "https://cdnv2.ruguoapp.com/avatar.jpg",
            radius: 4,
          },
        },
        preview: {
          text: "",
          picture: ["https://cdnv2.ruguoapp.com/picture.jpg"],
        },
      },
    ])
  })

  it("maps reposts to repost URLs and previews the target post", () => {
    expect(jikePostsToNewsItems([
      {
        id: "6a45f99e3fc142e22cd61726",
        type: "REPOST",
        content: "Worth reading",
        actionTime: "2026-07-02T05:39:42.698Z",
        user: {
          screenName: "Reposter",
        },
        target: {
          id: "6a45f1d24683afd739f2bad0",
          content: "Original content",
          user: {
            screenName: "Author",
          },
          pictures: [
            {
              picUrl: "https://cdnv2.ruguoapp.com/original.png",
            },
          ],
        },
      },
    ])).toEqual([
      {
        title: "Worth reading",
        url: "https://m.okjike.com/reposts/6a45f99e3fc142e22cd61726",
        timestamp: 1782970782698,
        inline: {
          text: "Reposter",
        },
        preview: {
          text: "Author: Original content",
          picture: ["https://cdnv2.ruguoapp.com/original.png"],
        },
      },
    ])
  })

  it("loads hottest topic feed through the selected topic tab", async () => {
    vi.mocked(myFetch).mockResolvedValueOnce({
      data: [
        {
          id: "6a4655b0228d9ca1696e52ec",
          type: "ORIGINAL_POST",
          content: "Topic post",
          createdAt: "2026-07-02T12:12:32.834Z",
          likeCount: 3,
          commentCount: 1,
          topic: {
            content: "即友日记本",
          },
          user: {
            screenName: "Topic author",
            avatarImage: {
              thumbnailUrl: "https://cdnv2.ruguoapp.com/topic-avatar.jpg",
            },
          },
        },
        {
          presentingType: "HASHTAGS",
          hashtags: [],
        },
      ],
    })

    const items = await fetchJikeTopicHottestFeed({
      topicId: " 5aeaa84029e4000011ac3768 ",
    })

    expect(myFetch).toHaveBeenCalledWith(
      "https://api.ruguoapp.com/1.0/topics/tabs/selected/feed",
      expect.objectContaining({
        credentials: "include",
        method: "POST",
        headers: expect.objectContaining({
          "platform": "web",
          "x-jike-access-token": "jike-token",
        }),
        body: {
          limit: 50,
          topicId: "5aeaa84029e4000011ac3768",
        },
      }),
    )
    expect(items).toEqual([
      {
        title: "Topic post",
        url: "https://m.okjike.com/originalPosts/6a4655b0228d9ca1696e52ec",
        timestamp: 1782994352834,
        inline: {
          text: "Topic author · #即友日记本 · 3 likes · 1 comments",
          icon: {
            src: "https://cdnv2.ruguoapp.com/topic-avatar.jpg",
            radius: 4,
          },
        },
      },
    ])
  })

  it("loads user updates through the single personal update endpoint", async () => {
    vi.mocked(myFetch).mockResolvedValueOnce({
      data: [
        {
          id: "6864e4b7c998cba3b2383120",
          type: "ORIGINAL_POST",
          content: "Pinned user post",
          actionTime: "2025-07-02T07:50:15.000Z",
          pinned: {
            personalUpdate: true,
          },
          user: {
            screenName: "哥飞",
          },
        },
        {
          id: "6a464c6064a7b806f12270a5",
          type: "ORIGINAL_POST",
          content: "User post",
          actionTime: "2026-07-02T11:32:48.000Z",
          pinned: {
            personalUpdate: false,
          },
          user: {
            screenName: "哥飞",
          },
        },
      ],
    })

    const items = await fetchJikeUserUpdates({
      username: " a2d6acc1-626f-4d15-a22a-849e88a4c9f0 ",
    })

    expect(myFetch).toHaveBeenCalledWith(
      "https://api.ruguoapp.com/1.0/personalUpdate/single",
      expect.objectContaining({
        credentials: "include",
        method: "POST",
        headers: expect.objectContaining({
          "platform": "web",
          "x-jike-access-token": "jike-token",
        }),
        body: {
          limit: 50,
          username: "a2d6acc1-626f-4d15-a22a-849e88a4c9f0",
        },
      }),
    )
    expect(items).toEqual([
      {
        title: "User post",
        url: "https://m.okjike.com/originalPosts/6a464c6064a7b806f12270a5",
        timestamp: 1782991968000,
        inline: {
          text: "哥飞",
        },
      },
    ])
  })

  it("loads recent topic feed through the square topic tab", async () => {
    vi.mocked(myFetch).mockResolvedValueOnce({
      data: [
        {
          id: "6a46558064a7b806f1234f72",
          type: "ORIGINAL_POST",
          content: "Recent topic post",
          createdAt: "2026-07-02T12:11:44.199Z",
          user: {
            screenName: "Recent author",
          },
        },
      ],
    })

    await fetchJikeTopicRecentFeed({
      topicId: "5aeaa84029e4000011ac3768",
    })

    expect(myFetch).toHaveBeenCalledWith(
      "https://api.ruguoapp.com/1.0/topics/tabs/square/feed",
      expect.objectContaining({
        body: {
          limit: 50,
          topicId: "5aeaa84029e4000011ac3768",
        },
      }),
    )
  })

  it("skips non-post updates without a shareable URL", () => {
    expect(jikePostsToNewsItems([
      {
        id: "6a45f5761fbb9ec808977429",
        type: "PERSONAL_UPDATE",
        actionTime: "2026-07-02T05:21:58.899Z",
        user: {
          screenName: "Follower",
        },
      },
    ])).toEqual([])
  })

  it("surfaces Jike API errors", async () => {
    vi.mocked(myFetch).mockResolvedValueOnce({
      success: false,
      error: {
        message: "Invalid token",
      },
    })

    await expect(fetchJikeFollowingUpdates()).rejects.toThrow("Invalid token")
  })
})
