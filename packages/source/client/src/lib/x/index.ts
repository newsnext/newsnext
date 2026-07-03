import type { NewsItem, SourceLoaderContext } from "@newsnext/source-shared/typings"

import type {
  LocationId,
  XHomeTimelineResponse,
  XPlaceTrendResponse,
  XTrendingParams,
  XUserByScreenNameResponse,
  XUserTweetsParams,
  XUserTweetsResponse,
} from "./types"
import { myFetch } from "@newsnext/source-shared/utils/fetch"
import { $selectParam, $textParam } from "@newsnext/source-shared/utils/params"
import { $provider, $source } from "@newsnext/source-shared/utils/source"
import { LOCATION_OPTIONS as X_LOCATION_OPTIONS } from "./types"

import {
  createXLoggedInHeaders,
  entriesToNewsItems,
  getTimelineEntries,
  HOME_LATEST_TIMELINE_URL,
  HOME_TIMELINE_COUNT,
  HOME_TIMELINE_URL,
  isUserTweetEntry,
  normalizeXSearchUrl,
  normalizeXUsername,
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

export { normalizeXUsername } from "./utils"

export async function fetchXPlaceTrends({ location }: XTrendingParams, context?: SourceLoaderContext): Promise<NewsItem[]> {
  const headers = await createXLoggedInHeaders(context)

  const response = await myFetch<XPlaceTrendResponse[]>(PLACE_TRENDS_URL, {
    headers,
    credentials: "include",
    query: { id: location },
  })

  const createdAt = response[0]?.created_at
  const timestamp = createdAt ? new Date(createdAt).getTime() : undefined

  return (response[0]?.trends ?? []).map(trend => ({
    title: trend.name,
    url: normalizeXSearchUrl(trend.url),
    timestamp,
  }))
}

export async function fetchXTimeline(url: string, context?: SourceLoaderContext): Promise<NewsItem[]> {
  const headers = await createXLoggedInHeaders(context)
  const response = await myFetch<XHomeTimelineResponse>(url, {
    method: "POST",
    headers,
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

export async function fetchXUserTweets({ username }: XUserTweetsParams, context?: SourceLoaderContext): Promise<NewsItem[]> {
  const screenName = normalizeXUsername(username)
  const headers = await createXLoggedInHeaders(context)

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

  const userId = user.data?.user?.result?.rest_id
  if (!userId) {
    throw new Error(`Cannot find X user: ${screenName}`)
  }

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
  const items = entriesToNewsItems(getTimelineEntries(instructions).filter(isUserTweetEntry))

  return sortNewsItemsByNewest(items)
}

export default $provider({
  title: "X",
  icon: "https://x.com/favicon.ico",
  color: "slate",
  home: X_ORIGIN,
  category: "world",
  secrets: [
    {
      key: X_CSRF_TOKEN_SECRET_KEY,
      type: "cookie",
      origin: X_ORIGIN,
      itemKey: "ct0",
      cache: false,
    },
  ],
  sources: [
    $source(
      {
        key: "place-trends",
        title: "Trending",
        type: "hottest",
        params: {
          location: $selectParam<LocationId>({
            title: "Location",
            options: [...X_LOCATION_OPTIONS],
            default: "1",
          }),
        },
      },
      fetchXPlaceTrends,
    ),
    $source(
      {
        key: "recommended",
        title: "Recommended",
        type: "timeline",
      },
      (_params, context) => fetchXTimeline(HOME_TIMELINE_URL, context),
    ),
    $source(
      {
        key: "following",
        title: "Following",
        type: "timeline",
      },
      (_params, context) => fetchXTimeline(HOME_LATEST_TIMELINE_URL, context),
    ),
    $source(
      {
        key: "user",
        title: "User Tweets",
        type: "timeline",
        params: {
          username: $textParam({
            title: "Username",
            default: "elonmusk",
            parse: value => normalizeXUsername(String(value)),
            validate: value => /^\w{1,15}$/.test(value) || "Username must be a valid X handle.",
          }),
        },
      },
      fetchXUserTweets,
    ),
  ],
})
