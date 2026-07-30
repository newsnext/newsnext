import type { ProviderConfig } from "@newsnext/source/registry"
import type {
  NewsItem,
  SourceLoaderContext,
  SourceLoaderResult,
} from "@newsnext/source/types"
import type {
  XHomeTimelineResponse,
  XPlaceTrendResponse,
  XUserByScreenNameResponse,
  XUserTweetsResponse,
} from "./types"
import { myFetch } from "@newsnext/source/utils"
import { LOCATION_OPTIONS } from "./types"
import {
  createXLoggedInHeaders,
  entriesToNewsItems,
  getTimelineEntries,
  HOME_LATEST_TIMELINE_URL,
  HOME_TIMELINE_COUNT,
  HOME_TIMELINE_URL,
  isUserTweetEntry,
  normalizeXSearchUrl,
  PLACE_TRENDS_URL,
  sortNewsItemsByNewest,
  USER_BY_SCREEN_NAME_URL,
  USER_TWEETS_COUNT,
  USER_TWEETS_URL,
  X_CSRF_TOKEN_SECRET_KEY,
  X_FEATURES,
  X_ORIGIN,
  X_USER_FEATURES,
} from "./utils"

const X_RADAR_RESERVED_PATHS = [
  "compose",
  "explore",
  "home",
  "i",
  "intent",
  "messages",
  "notifications",
  "search",
  "settings",
  "share",
]

async function fetchXPlaceTrends(
  { location }: { location: string },
  context?: SourceLoaderContext,
): Promise<NewsItem[]> {
  const response = await myFetch<XPlaceTrendResponse[]>(PLACE_TRENDS_URL, {
    headers: createXLoggedInHeaders(context),
    credentials: "include",
    query: { id: location },
  })
  const timestamp = response[0]?.created_at ? Date.parse(response[0].created_at) : undefined
  return (response[0]?.trends ?? []).map(trend => ({
    title: trend.name,
    url: normalizeXSearchUrl(trend.url),
    timestamp,
  }))
}

async function fetchXTimeline(url: string, context?: SourceLoaderContext): Promise<NewsItem[]> {
  const response = await myFetch<XHomeTimelineResponse>(url, {
    method: "POST",
    headers: createXLoggedInHeaders(context),
    credentials: "include",
    body: {
      variables: {
        count: HOME_TIMELINE_COUNT,
        includePromotedContent: true,
        latestControlAvailable: true,
        requestContext: "launch",
        withCommunity: true,
        seenTweetIds: [],
      },
      features: X_FEATURES,
    },
  })
  const instructions = response.data?.home?.home_timeline_urt?.instructions ?? []
  return sortNewsItemsByNewest(entriesToNewsItems(getTimelineEntries(instructions)))
}

async function fetchXUserTweets(
  { username }: { username: string },
  context?: SourceLoaderContext,
): Promise<SourceLoaderResult> {
  const screenName = username.trim()
  if (!/^\w{1,15}$/.test(screenName)) throw new Error("X username must be a valid handle.")

  const headers = createXLoggedInHeaders(context)
  const user = await myFetch<XUserByScreenNameResponse>(USER_BY_SCREEN_NAME_URL, {
    headers,
    credentials: "include",
    query: {
      variables: JSON.stringify({
        screen_name: screenName,
        withSafetyModeUserFields: false,
      }),
      features: JSON.stringify(X_USER_FEATURES),
      fieldToggles: JSON.stringify({
        withAuxiliaryUserLabels: false,
      }),
    },
  })
  const userResult = user.data?.user?.result
  const userId = userResult?.rest_id
  if (!userId) throw new Error(`Cannot find X user: ${screenName}`)

  const response = await myFetch<XUserTweetsResponse>(USER_TWEETS_URL, {
    headers,
    credentials: "include",
    query: {
      variables: JSON.stringify({
        userId,
        count: USER_TWEETS_COUNT,
        includePromotedContent: true,
        withQuickPromoteEligibilityTweetFields: true,
        withVoice: true,
        withV2Timeline: true,
      }),
      features: JSON.stringify(X_FEATURES),
    },
  })
  const instructions = response.data?.user?.result?.timeline_v2?.timeline?.instructions ?? []
  const badge = userResult.legacy?.profile_image_url_https
  return {
    items: sortNewsItemsByNewest(
      entriesToNewsItems(
        getTimelineEntries(instructions).filter(isUserTweetEntry),
        { includeIcon: false },
      ),
    ),
    ...(badge ? { metadata: { badge } } : {}),
  }
}

const capabilities = {
  network: ["x.com", "api.x.com"],
  cookies: ["x.com"],
}

export default {
  title: "X",
  category: "social",
  color: "slate",
  defaults: {
    baseUrl: `${X_ORIGIN}/`,
    capabilities,
    cache: "5m",
    loader: {
      type: "custom",
    },
    metadata: {
      home: "/",
      type: "timeline",
    },
    secrets: [
      {
        key: X_CSRF_TOKEN_SECRET_KEY,
        type: "cookie",
        origin: X_ORIGIN,
        itemKey: "ct0",
        cache: false,
      },
    ],
  },
  sources: {
    "place-trends": {
      metadata: {
        title: "Trending",
        type: "hottest",
      },
      params: {
        location: {
          type: "select",
          title: "Location",
          values: LOCATION_OPTIONS,
          default: "1",
        },
      },
      loader: {
        load: fetchXPlaceTrends,
      },
    },
    "recommended": {
      metadata: {
        title: "Recommended",
      },
      loader: {
        load: (_params, context) => fetchXTimeline(HOME_TIMELINE_URL, context),
      },
    },
    "following": {
      metadata: {
        title: "Following",
      },
      loader: {
        load: (_params, context) => fetchXTimeline(HOME_LATEST_TIMELINE_URL, context),
      },
    },
    "user": {
      metadata: {
        title: "User Tweets",
      },
      radar: [
        {
          id: "x-user",
          match: {
            hosts: ["x.com", "twitter.com"],
            paths: ["/:username", "/:username/*rest"],
          },
          patch: {
            params: {
              username: "{{ scope.path.username }}",
            },
            metadata: {
              title: {
                select: "[data-testid=\"UserName\"]",
              },
              desc: {
                select: "[data-testid=\"UserDescription\"]",
              },
            },
          },
          confidence: 0.95,
        },
      ],
      params: {
        username: {
          type: "text",
          title: "Username",
          default: "elonmusk",
          pattern: "^\\w{1,15}$",
          notIn: X_RADAR_RESERVED_PATHS,
        },
      },
      loader: {
        load: fetchXUserTweets,
      },
      cache: {
        version: 2,
        maxAge: "5m",
      },
    },
  },
} satisfies ProviderConfig
