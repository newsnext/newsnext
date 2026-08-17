import type { XTweetResult } from "./types"
import { validateSourceLoaderResult } from "@newsnext/source/core"
import { describe, expect, it } from "vitest"
import {
  entriesToNewsItems,
  getTimelineEntries,
  parseXUserIdCookie,
} from "./utils"

function createTweet(id: string, screenName: string): XTweetResult {
  return {
    __typename: "Tweet",
    rest_id: id,
    core: {
      user_results: {
        result: {
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
  return validateSourceLoaderResult({ items }).items
}

describe("parseXUserIdCookie", () => {
  it("reads the numeric user ID from X's encoded cookie", () => {
    expect(parseXUserIdCookie("u%3D1234567890")).toBe("1234567890")
    expect(parseXUserIdCookie("u=1234567890")).toBe("1234567890")
  })

  it("rejects malformed cookie values", () => {
    expect(parseXUserIdCookie("screen_name=user")).toBeUndefined()
    expect(parseXUserIdCookie("%E0%A4%A")).toBeUndefined()
    expect(parseXUserIdCookie(undefined)).toBeUndefined()
  })
})

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
})
