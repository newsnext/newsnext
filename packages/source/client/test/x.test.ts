import { myFetch } from "@newsnext/source-shared/utils/fetch"
import { beforeEach, describe, expect, it, vi } from "vitest"
import xProvider, { fetchXPlaceTrends, fetchXUserTweets } from "../src/lib/x"

vi.mock("@newsnext/source-shared/utils/fetch", () => ({
  myFetch: vi.fn(),
}))

describe("x source", () => {
  beforeEach(() => {
    vi.mocked(myFetch).mockReset()
    Object.assign(globalThis, {
      chrome: {
        cookies: {
          get: vi.fn((_details, callback) => {
            callback?.({ value: "csrf-token" })
          }),
        },
        runtime: {},
      },
    })
  })

  it("loads place trends through logged-in X credentials", async () => {
    vi.mocked(myFetch)
      .mockResolvedValueOnce([
        {
          created_at: "2026-06-28T10:00:00Z",
          trends: [
            {
              name: "#NewsNext",
              url: "http://twitter.com/search?q=%23NewsNext",
              query: "%23NewsNext",
              tweet_volume: 12345,
            },
            {
              name: "TypeScript",
              url: "http://twitter.com/search?q=TypeScript",
              query: "TypeScript",
              tweet_volume: null,
            },
          ],
        },
      ])

    const items = await fetchXPlaceTrends({ location: "1" })

    expect(myFetch).toHaveBeenCalledTimes(1)
    expect(myFetch).toHaveBeenNthCalledWith(
      1,
      "https://api.x.com/1.1/trends/place.json",
      expect.objectContaining({
        credentials: "include",
        headers: expect.objectContaining({
          "x-csrf-token": "csrf-token",
          "x-twitter-auth-type": "OAuth2Session",
        }),
        query: { id: "1" },
      }),
    )
    expect(items[0]).toEqual(
      {
        title: "#NewsNext",
        url: "https://x.com/search?q=%23NewsNext",
        timestamp: Date.parse("2026-06-28T10:00:00Z"),
      },
    )
  })

  it("loads tweets for a screen name through logged-in GraphQL endpoints", async () => {
    vi.mocked(myFetch)
      .mockResolvedValueOnce({
        data: {
          user: {
            result: {
              rest_id: "4398626122",
            },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          user: {
            result: {
              timeline_v2: {
                timeline: {
                  instructions: [
                    {
                      type: "TimelineAddEntries",
                      entries: [
                        {
                          entryId: "tweet-123",
                          content: {
                            itemContent: {
                              tweet_results: {
                                result: {
                                  __typename: "Tweet",
                                  rest_id: "123",
                                  core: {
                                    user_results: {
                                      result: {
                                        legacy: {
                                          profile_image_url_https: "https://pbs.twimg.com/profile_images/openai_normal.jpg",
                                          screen_name: "OpenAI",
                                        },
                                      },
                                    },
                                  },
                                  legacy: {
                                    created_at: "Fri Jun 26 12:00:00 +0000 2026",
                                    favorite_count: 1234,
                                    full_text: "Hello from X",
                                    entities: {
                                      media: [
                                        {
                                          media_url_https: "https://pbs.twimg.com/media/example.jpg",
                                        },
                                      ],
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                        {
                          entryId: "tweet-456",
                          content: {
                            itemContent: {
                              tweet_results: {
                                result: {
                                  __typename: "Tweet",
                                  rest_id: "456",
                                  core: {
                                    user_results: {
                                      result: {
                                        legacy: {
                                          profile_image_url_https: "https://pbs.twimg.com/profile_images/openai_normal.jpg",
                                          screen_name: "OpenAI",
                                        },
                                      },
                                    },
                                  },
                                  legacy: {
                                    created_at: "Sat Jun 27 12:00:00 +0000 2026",
                                    favorite_count: 1,
                                    full_text: "Newer tweet",
                                    entities: {},
                                  },
                                },
                              },
                            },
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
      })

    const items = await fetchXUserTweets({ username: "@OpenAI" })

    expect(myFetch).toHaveBeenCalledTimes(2)
    expect(myFetch).toHaveBeenNthCalledWith(
      1,
      "https://x.com/i/api/graphql/NimuplG1OB7Fd2btCLdBOw/UserByScreenName",
      expect.objectContaining({
        credentials: "include",
        headers: expect.objectContaining({
          "x-csrf-token": "csrf-token",
          "x-twitter-auth-type": "OAuth2Session",
        }),
        query: expect.objectContaining({
          variables: JSON.stringify({
            screen_name: "OpenAI",
            withSafetyModeUserFields: false,
          }),
        }),
      }),
    )
    expect(myFetch).toHaveBeenNthCalledWith(
      2,
      "https://x.com/i/api/graphql/QWF3SzpHmykQHsQMixG0cg/UserTweets",
      expect.objectContaining({
        credentials: "include",
        query: expect.objectContaining({
          variables: expect.stringContaining("\"count\":40"),
        }),
      }),
    )
    expect(items).toEqual([
      {
        title: "Newer tweet",
        url: "https://x.com/OpenAI/status/456",
        timestamp: Date.parse("Sat Jun 27 12:00:00 +0000 2026"),
        inline: {
          text: "1 like",
          icon: {
            src: "https://pbs.twimg.com/profile_images/openai_normal.jpg",
            radius: 999,
          },
        },
      },
      {
        title: "Hello from X",
        url: "https://x.com/OpenAI/status/123",
        timestamp: Date.parse("Fri Jun 26 12:00:00 +0000 2026"),
        inline: {
          text: "1.2K likes",
          icon: {
            src: "https://pbs.twimg.com/profile_images/openai_normal.jpg",
            radius: 999,
          },
        },
        preview: {
          text: "Hello from X",
          picture: ["https://pbs.twimg.com/media/example.jpg"],
        },
      },
    ])
  })

  it("loads the logged-in following timeline", async () => {
    vi.mocked(myFetch).mockResolvedValueOnce({
      data: {
        home: {
          home_timeline_urt: {
            instructions: [
              {
                type: "TimelineAddEntries",
                entries: [
                  {
                    entryId: "tweet-789",
                    content: {
                      itemContent: {
                        tweet_results: {
                          result: {
                            __typename: "Tweet",
                            rest_id: "789",
                            core: {
                              user_results: {
                                result: {
                                  legacy: {
                                    screen_name: "NewsNext",
                                  },
                                },
                              },
                            },
                            legacy: {
                              created_at: "Sun Jun 28 09:30:00 +0000 2026",
                              favorite_count: 42,
                              full_text: "Following timeline tweet",
                              entities: {},
                            },
                          },
                        },
                      },
                    },
                  },
                  {
                    entryId: "tweet-790",
                    content: {
                      itemContent: {
                        tweet_results: {
                          result: {
                            __typename: "Tweet",
                            rest_id: "790",
                            core: {
                              user_results: {
                                result: {
                                  legacy: {
                                    screen_name: "NewsNext",
                                  },
                                },
                              },
                            },
                            legacy: {
                              created_at: "Sun Jun 28 10:30:00 +0000 2026",
                              favorite_count: 9876,
                              full_text: "Newer following timeline tweet",
                              entities: {},
                            },
                          },
                        },
                      },
                    },
                  },
                ],
              },
            ],
          },
        },
      },
    })

    const items = await xProvider.sources.following.loader({})

    expect(myFetch).toHaveBeenCalledOnce()
    expect(myFetch).toHaveBeenCalledWith(
      "https://x.com/i/api/graphql/U0cdisy7QFIoTfu3-Okw0A/HomeLatestTimeline",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: expect.objectContaining({
          "x-csrf-token": "csrf-token",
          "x-twitter-auth-type": "OAuth2Session",
        }),
        body: expect.objectContaining({
          variables: expect.objectContaining({
            count: 20,
            requestContext: "launch",
            seenTweetIds: [],
          }),
        }),
      }),
    )
    expect(items).toEqual([
      {
        title: "Newer following timeline tweet",
        url: "https://x.com/NewsNext/status/790",
        timestamp: Date.parse("Sun Jun 28 10:30:00 +0000 2026"),
        inline: {
          text: "9.9K likes",
        },
      },
      {
        title: "Following timeline tweet",
        url: "https://x.com/NewsNext/status/789",
        timestamp: Date.parse("Sun Jun 28 09:30:00 +0000 2026"),
        inline: {
          text: "42 likes",
        },
      },
    ])
  })
})
