import type { RedditPost } from "./types"
import { describe, expect, it } from "vitest"
import { redditPostsToNewsItems } from "./utils"

describe("redditPostsToNewsItems", () => {
  it("maps posts while preserving listing and gallery order", () => {
    const posts: RedditPost[] = [
      {
        title: "Older post",
        permalink: "/r/typescript/comments/older/older_post/",
        author: "first_author",
        subreddit: "typescript",
        created_utc: 100,
        score: 1,
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

    expect(redditPostsToNewsItems(posts)).toEqual([
      {
        title: "Older post",
        url: "https://www.reddit.com/r/typescript/comments/older/older_post/",
        timestamp: 100000,
        inline: {
          text: "r/typescript · u/first_author · 1 point · 2 comments",
        },
        preview: {
          text: "Post body",
          picture: [
            "https://preview.redd.it/second.png",
            "https://preview.redd.it/first.png?x=1&y=2",
          ],
        },
      },
      {
        title: "Newer post",
        url: "https://www.reddit.com/r/typescript/comments/newer/newer_post/",
        timestamp: 200000,
        inline: {
          text: "r/typescript · u/second_author · 1.2K points · 1 comment",
        },
        preview: {
          text: "",
          picture: ["https://external-preview.redd.it/preview.jpg?x=1&y=2"],
        },
      },
    ])
  })

  it("omits the repeated user name and invalid posts", () => {
    expect(redditPostsToNewsItems([
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
      includeAuthor: false,
      includeSubredditIcon: true,
    })).toEqual([
      {
        title: "Valid post",
        url: "https://www.reddit.com/r/news/comments/valid/post/",
        inline: {
          text: "r/news",
          icon: {
            src: "https://styles.redditmedia.com/community.png",
            radius: 999,
          },
        },
      },
    ])
  })
})
