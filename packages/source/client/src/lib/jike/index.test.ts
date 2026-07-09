import { myFetch } from "@newsnext/source-shared/utils/fetch"
import { beforeEach, describe, expect, it, vi } from "vitest"

import jikeProvider, { fetchJikeFollowingUpdates, fetchJikeTopicHottestFeed, fetchJikeTopicRecentFeed, fetchJikeUserUpdates, jikePostsToNewsItems } from "."

vi.mock("@newsnext/source-shared/utils/fetch", () => ({
  myFetch: vi.fn(),
}))

const JIKE_CONTEXT = {
  secrets: {
    accessToken: "stored-access-token",
    refreshToken: "stored-refresh-token",
  },
}

function createJwt(expiresInSeconds: number): string {
  const encode = (value: unknown) => btoa(JSON.stringify(value))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")

  return `${encode({ alg: "none" })}.${encode({
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  })}.signature`
}

describe("jike source", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.mocked(myFetch).mockReset()
    vi.useRealTimers()
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Refresh token request failed"))
  })

  it("registers following updates as a timeline source", () => {
    expect(jikeProvider.sources["following-updates"]).toMatchObject({
      title: "Following updates",
      type: "timeline",
      home: "https://web.okjike.com",
      secrets: [
        {
          key: "accessToken",
          type: "localStorage",
          origin: "https://web.okjike.com",
          itemKey: "JK_ACCESS_TOKEN",
        },
        {
          key: "refreshToken",
          type: "localStorage",
          origin: "https://web.okjike.com",
          itemKey: "JK_REFRESH_TOKEN",
        },
      ],
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
        default: "7f422d5d-d79a-4f45-9880-b89d64d7f37a",
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
            username: "newsnext-user",
            profileImageUrl: "https://cdnv2.ruguoapp.com/avatar.jpg",
          },
        },
      ],
    })

    const items = await fetchJikeFollowingUpdates({}, JIKE_CONTEXT)

    expect(myFetch).toHaveBeenCalledWith(
      "https://api.ruguoapp.com/1.0/personalUpdate/followingUpdates",
      expect.objectContaining({
        credentials: "include",
        method: "POST",
        headers: expect.objectContaining({
          "platform": "web",
          "x-jike-access-token": "stored-access-token",
        }),
        body: {
          limit: 50,
        },
      }),
    )
    expect(items).toEqual([
      {
        title: "A fresh update",
        url: "https://web.okjike.com/u/newsnext-user/post/6a464f3e54aae0885e15bd28",
        mobileUrl: "https://m.okjike.com/originalPosts/6a464f3e54aae0885e15bd28",
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

  it("uses injected auth secrets", async () => {
    vi.mocked(myFetch).mockResolvedValueOnce({
      success: true,
      data: [],
    })

    await fetchJikeFollowingUpdates({}, {
      secrets: {
        accessToken: "context-access-token",
        refreshToken: "context-refresh-token",
      },
    })

    expect(myFetch).toHaveBeenCalledWith(
      "https://api.ruguoapp.com/1.0/personalUpdate/followingUpdates",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-jike-access-token": "context-access-token",
        }),
      }),
    )
  })

  it("refreshes an access token when only the refresh token is available", async () => {
    const updateSecrets = vi.fn()
    const fetchMock = vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(null, {
        status: 200,
        headers: {
          "x-jike-access-token": "fresh-access-token",
        },
      }),
    )
    vi.mocked(myFetch).mockResolvedValueOnce({
      success: true,
      data: [],
    })

    await fetchJikeFollowingUpdates({}, {
      secrets: {
        refreshToken: "stored-refresh-token",
      },
      updateSecrets,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.ruguoapp.com/app_auth_tokens.refresh",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-jike-refresh-token": "stored-refresh-token",
        }),
      }),
    )
    expect(myFetch).toHaveBeenCalledWith(
      "https://api.ruguoapp.com/1.0/personalUpdate/followingUpdates",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-jike-access-token": "fresh-access-token",
        }),
      }),
    )
    expect(updateSecrets).toHaveBeenCalledWith({
      accessToken: "fresh-access-token",
    })
  })

  it("requires the Jike refresh token", async () => {
    await expect(fetchJikeFollowingUpdates({}, {
      secrets: {
        accessToken: "stored-access-token",
      },
    })).rejects.toThrow("Jike refreshToken secret is required.")
  })

  it("refreshes the Jike access token after the first request fails with an auth status", async () => {
    const updateSecrets = vi.fn()
    const fetchMock = vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(null, {
        status: 200,
        headers: {
          "x-jike-access-token": "fresh-access-token",
        },
      }),
    )
    const authError = new Error("Unauthorized")
    Object.assign(authError, { status: 401 })
    vi.mocked(myFetch)
      .mockRejectedValueOnce(authError)
      .mockResolvedValueOnce({
        success: true,
        data: [],
      })

    await fetchJikeFollowingUpdates({}, {
      secrets: {
        accessToken: "old-access-token",
        refreshToken: "stored-refresh-token",
      },
      updateSecrets,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.ruguoapp.com/app_auth_tokens.refresh",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "platform": "web",
          "x-jike-refresh-token": "stored-refresh-token",
        },
        body: "{}",
      }),
    )
    expect(myFetch).toHaveBeenNthCalledWith(
      1,
      "https://api.ruguoapp.com/1.0/personalUpdate/followingUpdates",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-jike-access-token": "old-access-token",
        }),
      }),
    )
    expect(myFetch).toHaveBeenNthCalledWith(
      2,
      "https://api.ruguoapp.com/1.0/personalUpdate/followingUpdates",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-jike-access-token": "fresh-access-token",
        }),
      }),
    )
    expect(updateSecrets).toHaveBeenCalledWith({
      accessToken: "fresh-access-token",
    })
  })

  it("does not refresh the Jike access token after a non-auth request failure", async () => {
    const requestError = new Error("Internal Server Error")
    Object.assign(requestError, { status: 500 })
    vi.mocked(myFetch).mockRejectedValueOnce(requestError)

    await expect(fetchJikeFollowingUpdates({}, {
      secrets: {
        accessToken: "old-access-token",
        refreshToken: "stored-refresh-token",
      },
    })).rejects.toThrow("Internal Server Error")

    expect(globalThis.fetch).not.toHaveBeenCalled()
    expect(myFetch).toHaveBeenCalledOnce()
    expect(myFetch).toHaveBeenCalledWith(
      "https://api.ruguoapp.com/1.0/personalUpdate/followingUpdates",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-jike-access-token": "old-access-token",
        }),
      }),
    )
  })

  it("refreshes an expired Jike access token before requesting the feed", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-03T10:00:00Z"))
    const updateSecrets = vi.fn()
    const fetchMock = vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(null, {
        status: 200,
        headers: {
          "x-jike-access-token": "fresh-access-token",
        },
      }),
    )
    vi.mocked(myFetch).mockResolvedValueOnce({
      success: true,
      data: [],
    })

    await fetchJikeFollowingUpdates({}, {
      secrets: {
        accessToken: createJwt(30),
        refreshToken: "stored-refresh-token",
      },
      updateSecrets,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.ruguoapp.com/app_auth_tokens.refresh",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-jike-refresh-token": "stored-refresh-token",
        }),
      }),
    )
    expect(myFetch).toHaveBeenCalledOnce()
    expect(myFetch).toHaveBeenCalledWith(
      "https://api.ruguoapp.com/1.0/personalUpdate/followingUpdates",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-jike-access-token": "fresh-access-token",
        }),
      }),
    )
    expect(updateSecrets).toHaveBeenCalledWith({
      accessToken: "fresh-access-token",
    })
  })

  it("uses a Jike access token with more than 30 seconds left without refreshing", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-03T10:00:00Z"))
    const accessToken = createJwt(31)
    vi.mocked(myFetch).mockResolvedValueOnce({
      success: true,
      data: [],
    })

    await fetchJikeFollowingUpdates({}, {
      secrets: {
        accessToken,
        refreshToken: "stored-refresh-token",
      },
    })

    expect(globalThis.fetch).not.toHaveBeenCalled()
    expect(myFetch).toHaveBeenCalledWith(
      "https://api.ruguoapp.com/1.0/personalUpdate/followingUpdates",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-jike-access-token": accessToken,
        }),
      }),
    )
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
          username: "reposter-user",
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
        url: "https://web.okjike.com/u/reposter-user/repost/6a45f99e3fc142e22cd61726",
        mobileUrl: "https://m.okjike.com/reposts/6a45f99e3fc142e22cd61726",
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
            username: "topic-author",
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
    }, JIKE_CONTEXT)

    expect(myFetch).toHaveBeenCalledWith(
      "https://api.ruguoapp.com/1.0/topics/tabs/selected/feed",
      expect.objectContaining({
        credentials: "include",
        method: "POST",
        headers: expect.objectContaining({
          "platform": "web",
          "x-jike-access-token": "stored-access-token",
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
        url: "https://web.okjike.com/u/topic-author/post/6a4655b0228d9ca1696e52ec",
        mobileUrl: "https://m.okjike.com/originalPosts/6a4655b0228d9ca1696e52ec",
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
            username: "gefei",
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
            username: "gefei",
          },
        },
      ],
    })

    const items = await fetchJikeUserUpdates({
      username: " a2d6acc1-626f-4d15-a22a-849e88a4c9f0 ",
    }, JIKE_CONTEXT)

    expect(myFetch).toHaveBeenCalledWith(
      "https://api.ruguoapp.com/1.0/personalUpdate/single",
      expect.objectContaining({
        credentials: "include",
        method: "POST",
        headers: expect.objectContaining({
          "platform": "web",
          "x-jike-access-token": "stored-access-token",
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
        url: "https://web.okjike.com/u/gefei/post/6a464c6064a7b806f12270a5",
        mobileUrl: "https://m.okjike.com/originalPosts/6a464c6064a7b806f12270a5",
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
    }, JIKE_CONTEXT)

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
        message: "Topic not found",
      },
    })

    await expect(fetchJikeFollowingUpdates({}, JIKE_CONTEXT)).rejects.toThrow("Topic not found")
  })
})
