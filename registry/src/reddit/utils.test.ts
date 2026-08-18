import type { RedditPost } from "./types"
import { validateSourceLoaderResult } from "@newsnext/source-kit/core"
import { describe, expect, it } from "vitest"
import { redditPostsToNewsItems } from "./utils"

function normalize(posts: RedditPost[], options?: Parameters<typeof redditPostsToNewsItems>[1]) {
  return validateSourceLoaderResult({ items: redditPostsToNewsItems(posts, options) }).items
}

describe("redditPostsToNewsItems", () => {
  it("maps posts while preserving listing and gallery order", () => {
    const posts: RedditPost[] = [
      {
        title: "Older post",
        permalink: "/r/typescript/comments/older/older_post/",
        author: "first_author",
        subreddit: "typescript",
        created_utc: 100,
        score: -1,
        num_comments: 2,
        selftext: "Post body",
        gallery_data: {
          items: [{ media_id: "second" }, { media_id: "first" }],
        },
        media_metadata: {
          first: { s: { u: "https://preview.redd.it/first.png?x=1&amp;y=2" } },
          second: { s: { u: "https://preview.redd.it/second.png" } },
        },
      },
      {
        title: "Newer post",
        permalink: "/r/typescript/comments/newer/newer_post/",
        author: "second_author",
        subreddit: "typescript",
        created_utc: 200,
        score: 1200,
        num_comments: 1,
        preview: {
          images: [{
            source: {
              url: "https://external-preview.redd.it/preview.jpg?x=1&amp;y=2",
            },
          }],
        },
      },
    ]

    expect(normalize(posts)).toEqual([
      {
        title: "Older post",
        url: "https://www.reddit.com/r/typescript/comments/older/older_post/",
        publishedAt: 100000,
        author: {
          name: "u/first_author",
          home: "https://www.reddit.com/user/first_author/",
        },
        stats: { score: -1, comments: 2 },
        attributes: { community: "r/typescript" },
        content: {
          text: "Post body",
          pictures: [
            "https://preview.redd.it/second.png",
            "https://preview.redd.it/first.png?x=1&y=2",
          ],
        },
      },
      {
        title: "Newer post",
        url: "https://www.reddit.com/r/typescript/comments/newer/newer_post/",
        publishedAt: 200000,
        author: {
          name: "u/second_author",
          home: "https://www.reddit.com/user/second_author/",
        },
        stats: { score: 1200, comments: 1 },
        attributes: { community: "r/typescript" },
        content: {
          pictures: ["https://external-preview.redd.it/preview.jpg?x=1&y=2"],
        },
      },
    ])
  })

  it("preserves semantic fields when presentation omits repeated context", () => {
    expect(normalize([
      {
        title: "Valid post",
        permalink: "/r/news/comments/valid/post/",
        author: "author",
        subreddit: "news",
        sr_detail: {
          community_icon: "https://styles.redditmedia.com/community.png",
        },
      },
      {
        title: "",
        permalink: "/r/news/comments/invalid/post/",
      },
    ], {
      includeSubredditIcon: true,
    })).toEqual([
      {
        title: "Valid post",
        url: "https://www.reddit.com/r/news/comments/valid/post/",
        author: {
          name: "u/author",
          home: "https://www.reddit.com/user/author/",
        },
        attributes: { community: "r/news" },
        icon: {
          kind: "community",
          label: "r/news",
          src: "https://styles.redditmedia.com/community.png",
        },
      },
    ])
  })
})
