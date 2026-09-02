import type { XTweetResult } from "./types"
import { validateSourceLoaderOutput } from "@newsnext/source-kit/core"
import { describe, expect, it } from "vitest"
import {
  entriesToNewsItems,
  getTimelineEntries,
} from "./utils"

function createTweet(id: string, screenName: string): XTweetResult {
  return {
    __typename: "Tweet",
    rest_id: id,
    core: {
      user_results: {
        result: {
          rest_id: `${screenName}-id`,
          avatar: {
            image_url: `https://pbs.twimg.com/profile_images/${id}/avatar_normal.jpg`,
          },
          core: {
            screen_name: screenName,
          },
        },
      },
    },
    legacy: {
      created_at: "Tue Aug 11 08:48:53 +0000 2026",
      favorite_count: 1,
      full_text: `Tweet ${id}`,
    },
    grok_translated_post_with_availability: {
      is_available: true,
      data: {
        translation: `Translated tweet ${id}`,
      },
    },
  }
}

function normalize(items: ReturnType<typeof entriesToNewsItems>) {
  return validateSourceLoaderOutput({ items }).items
}

describe("getTimelineEntries", () => {
  it("parses direct tweets with the current X user shape", () => {
    const entries = getTimelineEntries([
      {
        entries: [
          {
            entryId: "tweet-2087098918509457746",
            content: {
              itemContent: {
                tweet_results: {
                  result: createTweet("2087098918509457746", "jesselaunz"),
                },
              },
            },
          },
        ],
      },
    ])

    expect(normalize(entriesToNewsItems(entries))).toEqual([
      expect.objectContaining({
        title: "Tweet 2087098918509457746",
        url: "https://x.com/jesselaunz/status/2087098918509457746",
        author: {
          name: "@jesselaunz",
          home: "https://x.com/jesselaunz",
        },
        stats: { likes: 1 },
        icon: {
          kind: "author",
          label: "@jesselaunz",
          src: "https://pbs.twimg.com/profile_images/2087098918509457746/avatar_normal.jpg",
        },
        content: {
          text: "Translated tweet 2087098918509457746",
        },
      }),
    ])

    expect(normalize(entriesToNewsItems(entries, { textMode: "translation" }))).toEqual([
      expect.objectContaining({
        title: "Translated tweet 2087098918509457746",
        content: {
          text: "Tweet 2087098918509457746",
        },
      }),
    ])
  })

  it("parses tweets nested inside timeline conversation modules", () => {
    const entries = getTimelineEntries([
      {
        entries: [
          {
            entryId: "profile-conversation-2087102520374591488",
            content: {
              items: [
                {
                  entryId: "profile-conversation-2087102520374591488-tweet-2087081719090614299",
                  item: {
                    itemContent: {
                      tweet_results: {
                        result: createTweet("2087081719090614299", "op7418"),
                      },
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    ])

    expect(entries.map(entry => entry.entryId)).toEqual([
      "profile-conversation-2087102520374591488",
      "profile-conversation-2087102520374591488-tweet-2087081719090614299",
    ])
    expect(normalize(entriesToNewsItems(entries))).toEqual([
      expect.objectContaining({
        title: "Tweet 2087081719090614299",
        url: "https://x.com/op7418/status/2087081719090614299",
        author: {
          name: "@op7418",
          home: "https://x.com/op7418",
        },
        stats: { likes: 1 },
        icon: {
          kind: "author",
          label: "@op7418",
          src: "https://pbs.twimg.com/profile_images/2087081719090614299/avatar_normal.jpg",
        },
      }),
    ])
  })

  it("falls back to original text when a translation is unavailable", () => {
    const tweet = createTweet("2086353229894529148", "thsottiaux")
    delete tweet.grok_translated_post_with_availability

    expect(normalize(entriesToNewsItems([
      {
        entryId: "tweet-2086353229894529148",
        content: {
          itemContent: {
            tweet_results: { result: tweet },
          },
        },
      },
    ], { textMode: "translation" }))).toEqual([
      expect.objectContaining({
        title: "Tweet 2086353229894529148",
      }),
    ])
  })

  it("keeps only tweets authored by the requested user", () => {
    const entries = [
      createTweet("reply", "requested"),
      createTweet("parent", "someone-else"),
    ].map(tweet => ({
      entryId: `tweet-${tweet.rest_id}`,
      content: {
        itemContent: {
          tweet_results: { result: tweet },
        },
      },
    }))

    expect(normalize(entriesToNewsItems(entries, { userId: "requested-id" })))
      .toEqual([
        expect.objectContaining({
          url: "https://x.com/requested/status/reply",
        }),
      ])
  })
})
