import type { JikePost } from "./types"
import { validateSourceLoaderOutput } from "@newsnext/source-kit/core"
import { describe, expect, it } from "vitest"
import { jikePostsToNewsItems } from "./utils"

function normalize(posts: JikePost[]) {
  return validateSourceLoaderOutput({ items: jikePostsToNewsItems(posts) }).items
}

describe("jikePostsToNewsItems", () => {
  it("maps semantic post fields from the Jike feed", () => {
    expect(normalize([
      {
        id: "6a7f15e560ddcfb0afac0774",
        type: "ORIGINAL_POST",
        content: "Cursor officially joins SpaceX",
        createdAt: "2026-08-14T13:19:34.000Z",
        likeCount: 1,
        commentCount: 2,
        repostCount: 3,
        topic: { content: "AI Explorers" },
        pictures: [{ middlePicUrl: "https://cdnv2.ruguoapp.com/post.png" }],
        user: {
          screenName: "Leo's AI Journal",
          username: "f81494ee-f3b1-4e96-8fe3-38789df5ded1",
          profileImageUrl: "https://cdnv2.ruguoapp.com/avatar.jpg",
        },
      },
    ])).toEqual([
      {
        title: "Cursor officially joins SpaceX",
        url: "https://web.okjike.com/u/f81494ee-f3b1-4e96-8fe3-38789df5ded1/post/6a7f15e560ddcfb0afac0774",
        publishedAt: 1786713574000,
        author: {
          name: "Leo's AI Journal",
          home: "https://web.okjike.com/u/f81494ee-f3b1-4e96-8fe3-38789df5ded1",
        },
        stats: { likes: 1, comments: 2, reposts: 3 },
        attributes: { topic: "AI Explorers" },
        icon: {
          kind: "author",
          label: "Leo's AI Journal",
          src: "https://cdnv2.ruguoapp.com/avatar.jpg",
        },
        content: {
          pictures: ["https://cdnv2.ruguoapp.com/post.png"],
        },
      },
    ])
  })

  it.each([
    ["ORIGINAL_POST", "author", "https://web.okjike.com/u/author/post/post-id"],
    ["REPOST", "author", "https://web.okjike.com/u/author/repost/post-id"],
    ["ORIGINAL_POST", undefined, "https://m.okjike.com/originalPosts/post-id"],
    ["REPOST", undefined, "https://m.okjike.com/reposts/post-id"],
  ])("resolves %s with username %s to one URL", (type, username, expected) => {
    const items = jikePostsToNewsItems([{
      id: "post-id",
      type,
      content: "Post",
      user: { username },
    }])
    expect(items.map(item => item.url)).toEqual([expected])
  })

  it("omits posts without a supported destination", () => {
    expect(jikePostsToNewsItems([
      { type: "ORIGINAL_POST", content: "Missing ID" },
      { id: "post-id", type: "UNKNOWN", content: "Unsupported type" },
    ])).toEqual([])
  })

  it("uses repost target content and pictures as fallbacks", () => {
    expect(normalize([
      {
        id: "repost-id",
        type: "REPOST",
        content: " ",
        user: { screenName: "Reposter", username: "reposter" },
        target: {
          content: "Original\ncontent",
          user: { screenName: "Original author" },
          pictures: [{ picUrl: "https://cdnv2.ruguoapp.com/original.png" }],
        },
      },
    ])).toEqual([
      expect.objectContaining({
        title: "Original content",
        content: {
          text: "Original author: Original content",
          pictures: ["https://cdnv2.ruguoapp.com/original.png"],
        },
      }),
    ])
  })
})
