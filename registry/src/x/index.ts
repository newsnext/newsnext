import type { ProviderConfig } from "@newsnext/source-kit/registry"
import type {
  SourceLoaderContext,
  SourceLoaderOutput,
} from "@newsnext/source-kit/types"
import type {
  XHomeTimelineResponse,
  XListTweetsResponse,
  XPlaceTrendResponse,
  XTweetTextMode,
  XUserByScreenNameResponse,
  XUserTweetsResponse,
} from "./types"
import { LOCATION_OPTIONS } from "./types"
import {
  createXLoggedInHeaders,
  entriesToNewsItems,
  getTimelineEntries,
  HOME_LATEST_TIMELINE_QUERY_ID,
  HOME_LATEST_TIMELINE_URL,
  isUserTweetEntry,
  LIST_LATEST_TWEETS_URL,
  normalizeXSearchUrl,
  PLACE_TRENDS_URL,
  sortNewsItemsByNewest,
  USER_BY_SCREEN_NAME_URL,
  USER_TWEETS_URL,
  X_CSRF_TOKEN_SECRET_KEY,
  X_INLINE_TEMPLATE,
  X_ORIGIN,
  X_TIMELINE_COUNT,
  X_TIMELINE_FEATURES,
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
interface XTweetTextParams {
  text: XTweetTextMode
}

interface XListParams extends XTweetTextParams {
  listId: string
}

interface XUserParams extends XTweetTextParams {
  username: string
}

const tweetTextParam = {
  type: "select",
  title: "Content",
  values: [
    { label: "Original", value: "original" },
    { label: "Translation", value: "translation" },
  ],
  default: "original",
} as const

async function fetchXPlaceTrends(
  { location }: { location: string },
  context: SourceLoaderContext,
): Promise<SourceLoaderOutput> {
  const response = await context.fetch.get(PLACE_TRENDS_URL, {
    headers: createXLoggedInHeaders(context),
    searchParams: { id: location },
  }).json<XPlaceTrendResponse[]>()
  const timestamp = response[0]?.created_at ? Date.parse(response[0].created_at) : undefined
  return {
    items: (response[0]?.trends ?? []).map(trend => ({
      title: trend.name,
      url: normalizeXSearchUrl(trend.url),
      publishedAt: timestamp,
    })),
  }
}

function xHomeTimelineToResult(
  response: XHomeTimelineResponse,
  textMode: XTweetTextMode,
): SourceLoaderOutput {
  const instructions = response.data?.home?.home_timeline_urt?.instructions ?? []
  return {
    items: sortNewsItemsByNewest(
      entriesToNewsItems(getTimelineEntries(instructions), { textMode }),
    ),
  }
}

async function fetchXFollowing(
  { text }: XTweetTextParams,
  context: SourceLoaderContext,
): Promise<SourceLoaderOutput> {
  const response = await context.fetch.post(HOME_LATEST_TIMELINE_URL, {
    headers: createXLoggedInHeaders(context),
    json: {
      variables: {
        count: X_TIMELINE_COUNT,
        enableRanking: true,
        includePromotedContent: false,
        requestContext: "launch",
        seenTweetIds: [],
      },
      features: X_TIMELINE_FEATURES,
      queryId: HOME_LATEST_TIMELINE_QUERY_ID,
    },
  }).json<XHomeTimelineResponse>()
  return xHomeTimelineToResult(response, text)
}

async function fetchXListTweets(
  { listId, text }: XListParams,
  context: SourceLoaderContext,
): Promise<SourceLoaderOutput> {
  const response = await context.fetch.get(LIST_LATEST_TWEETS_URL, {
    headers: createXLoggedInHeaders(context),
    searchParams: {
      variables: JSON.stringify({
        listId,
        count: X_TIMELINE_COUNT,
      }),
      features: JSON.stringify(X_TIMELINE_FEATURES),
    },
  }).json<XListTweetsResponse>()
  const instructions = response.data?.list?.tweets_timeline?.timeline?.instructions ?? []
  return {
    items: sortNewsItemsByNewest(
      entriesToNewsItems(getTimelineEntries(instructions), { textMode: text }),
    ),
  }
}

async function fetchXUserTweets(
  { text, username }: XUserParams,
  context: SourceLoaderContext,
): Promise<SourceLoaderOutput> {
  const headers = createXLoggedInHeaders(context)
  const user = await context.fetch.get(USER_BY_SCREEN_NAME_URL, {
    headers,
    searchParams: {
      variables: JSON.stringify({
        screen_name: username,
        withGrokTranslatedBio: true,
      }),
      features: JSON.stringify(X_USER_FEATURES),
      fieldToggles: JSON.stringify({
        withPayments: false,
        withAuxiliaryUserLabels: true,
      }),
    },
  }).json<XUserByScreenNameResponse>()
  const userResult = user.data?.user?.result
  const userId = userResult?.rest_id
  if (!userId) throw new Error(`Cannot find X user: ${username}`)

  const response = await context.fetch.get(USER_TWEETS_URL, {
    headers,
    searchParams: {
      variables: JSON.stringify({
        userId,
        count: X_TIMELINE_COUNT,
        includePromotedContent: false,
        withQuickPromoteEligibilityTweetFields: true,
        withVoice: true,
      }),
      features: JSON.stringify(X_TIMELINE_FEATURES),
      fieldToggles: JSON.stringify({
        withArticlePlainText: false,
      }),
    },
  }).json<XUserTweetsResponse>()
  const instructions = response.data?.user?.result?.timeline?.timeline?.instructions ?? []
  const badge = userResult.avatar?.image_url
  return {
    items: sortNewsItemsByNewest(
      entriesToNewsItems(
        getTimelineEntries(instructions).filter(isUserTweetEntry),
        { includeIcon: false, textMode: text },
      ),
    ),
    metadata: badge ? { badge } : undefined,
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
    loader: {
      type: "custom",
    },
    metadata: {
      home: "/",
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
      version: 3,
      metadata: {
        title: "Trending",
        type: "ranking",
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
    "following": {
      metadata: {
        title: "Following",
      },
      radar: [
        {
          id: "x-following",
          match: {
            hosts: ["x.com", "twitter.com"],
            paths: ["/home"],
          },
        },
      ],
      params: {
        text: tweetTextParam,
      },
      loader: {
        load: fetchXFollowing,
        inlineTemplate: X_INLINE_TEMPLATE,
      },
    },
    "list": {
      metadata: {
        title: "List",
      },
      radar: [
        {
          id: "x-list",
          match: {
            hosts: ["x.com", "twitter.com"],
            paths: {
              include: ["/i/lists/:listId"],
            },
          },
          patch: {
            params: {
              listId: "{{ scope.path.listId }}",
            },
            metadata: {
              title: {
                select: "[data-testid=\"primaryColumn\"] h2",
              },
              home: `${X_ORIGIN}/i/lists/{{ scope.params.listId }}`,
            },
          },
        },
      ],
      params: {
        listId: {
          type: "text",
          title: "List ID",
          default: "1678002608919937029",
          required: true,
          validate: { regex: "^\\d{1,20}$" },
        },
        text: tweetTextParam,
      },
      loader: {
        load: fetchXListTweets,
        inlineTemplate: X_INLINE_TEMPLATE,
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
            paths: {
              include: ["/:username", "/:username/*rest"],
              exclude: X_RADAR_RESERVED_PATHS.flatMap(path => [`/${path}`, `/${path}/*rest`]),
            },
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
        },
      ],
      params: {
        text: tweetTextParam,
        username: {
          type: "text",
          title: "Username",
          default: "elonmusk",
          required: true,
          validate: { regex: "^\\w{1,15}$" },
        },
      },
      loader: {
        load: fetchXUserTweets,
      },
      version: 3,
    },
  },
} satisfies ProviderConfig
