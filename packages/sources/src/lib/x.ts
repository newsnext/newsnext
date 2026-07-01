import type { NewsItem } from "@newsnext/shared/types"
import { myFetch } from "../utils/fetch"
import { $selectParam, $textParam } from "../utils/params"
import { $provider, $source } from "../utils/source"

const X_BEARER_TOKEN = "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
const X_ORIGIN = "https://x.com"
const PLACE_TRENDS_URL = "https://api.x.com/1.1/trends/place.json"
const HOME_TIMELINE_URL = `${X_ORIGIN}/i/api/graphql/-X_hcgQzmHGl29-UXxz4sw/HomeTimeline`
const HOME_LATEST_TIMELINE_URL = `${X_ORIGIN}/i/api/graphql/U0cdisy7QFIoTfu3-Okw0A/HomeLatestTimeline`
const USER_BY_SCREEN_NAME_URL = `${X_ORIGIN}/i/api/graphql/NimuplG1OB7Fd2btCLdBOw/UserByScreenName`
const USER_TWEETS_URL = `${X_ORIGIN}/i/api/graphql/QWF3SzpHmykQHsQMixG0cg/UserTweets`
const HOME_TIMELINE_COUNT = 20
const USER_TWEETS_COUNT = 40
const USER_TWEET_ENTRY_PREFIXES = ["tweet-", "profile-conversation-", "profile-grid-"]

const X_FEATURES = {
  creator_subscriptions_tweet_preview_api_enabled: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  tweetypie_unmention_optimization_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  tweet_awards_web_tipping_enabled: false,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  rweb_video_timestamps_enabled: true,
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  responsive_web_media_download_video_enabled: false,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_enhance_cards_enabled: false,
}

const X_USER_FEATURES = {
  hidden_profile_likes_enabled: true,
  hidden_profile_subscriptions_enabled: true,
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  subscriptions_verification_info_is_identity_verified_enabled: true,
  subscriptions_verification_info_verified_since_enabled: true,
  highlights_tweets_tab_ui_enabled: true,
  responsive_web_twitter_article_notes_tab_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  responsive_web_graphql_timeline_navigation_enabled: true,
}

const LOCATION_OPTIONS = [
  { label: "Worldwide", value: "1" },
  { label: "United States", value: "23424977" },
  { label: "United Kingdom", value: "23424975" },
  { label: "Japan", value: "23424856" },
  { label: "Hong Kong", value: "24865698" },
  { label: "Taiwan", value: "23424971" },
  { label: "Singapore", value: "23424948" },
  { label: "India", value: "23424848" },
  { label: "Brazil", value: "23424768" },
  { label: "Germany", value: "23424829" },
] as const

type LocationId = (typeof LOCATION_OPTIONS)[number]["value"]

interface XPlaceTrend {
  name: string
  url: string
}

interface XPlaceTrendResponse {
  trends: XPlaceTrend[]
  created_at?: string
}

interface XTrendingParams {
  location: LocationId
}

interface XUserTweetsParams {
  username: string
}

interface XUserByScreenNameResponse {
  data?: {
    user?: {
      result?: {
        rest_id?: string
      }
    }
  }
}

interface XTimelineInstruction {
  type?: string
  entry?: XTimelineEntry
  entries?: XTimelineEntry[]
}

interface XTimelineEntry {
  entryId?: string
  content?: {
    itemContent?: {
      tweet_results?: {
        result?: XTweetResult
      }
    }
  }
}

interface XTweetResult {
  __typename?: string
  tweet?: XTweetResult
  rest_id?: string
  core?: {
    user_results?: {
      result?: {
        legacy?: {
          profile_image_url_https?: string
          screen_name?: string
        }
      }
    }
  }
  legacy?: {
    created_at?: string
    favorite_count?: number
    full_text?: string
    entities?: {
      media?: Array<{
        media_url_https?: string
      }>
    }
  }
  note_tweet?: {
    note_tweet_results?: {
      result?: {
        text?: string
      }
    }
  }
}

interface XUserTweetsResponse {
  data?: {
    user?: {
      result?: {
        timeline_v2?: {
          timeline?: {
            instructions?: XTimelineInstruction[]
          }
        }
      }
    }
  }
}

interface XHomeTimelineResponse {
  data?: {
    home?: {
      home_timeline_urt?: {
        instructions?: XTimelineInstruction[]
      }
    }
  }
}

function createXHeaders(): Record<string, string> {
  return {
    "authorization": `Bearer ${X_BEARER_TOKEN}`,
    "content-type": "application/json",
    "referer": X_ORIGIN,
    "x-twitter-active-user": "yes",
  }
}

interface BrowserCookie {
  value?: string
}

interface BrowserCookiesApi {
  get: (
    details: { url: string, name: string },
    callback?: (cookie?: BrowserCookie) => void,
  ) => Promise<BrowserCookie | undefined> | void
}

interface BrowserExtensionGlobal {
  chrome?: {
    cookies?: BrowserCookiesApi
    runtime?: {
      lastError?: { message?: string }
    }
  }
  browser?: {
    cookies?: BrowserCookiesApi
  }
}

function isPromiseLike<T>(value: unknown): value is Promise<T> {
  return typeof value === "object"
    && value !== null
    && "then" in value
    && typeof value.then === "function"
}

function getExtensionCookiesApi(): BrowserCookiesApi | undefined {
  const extensionGlobal = globalThis as BrowserExtensionGlobal
  return extensionGlobal.browser?.cookies ?? extensionGlobal.chrome?.cookies
}

async function getXCsrfToken(): Promise<string | undefined> {
  const cookies = getExtensionCookiesApi()
  if (!cookies) {
    return undefined
  }

  const maybeCookie = cookies.get({ url: X_ORIGIN, name: "ct0" })
  if (isPromiseLike<BrowserCookie | undefined>(maybeCookie)) {
    return (await maybeCookie)?.value
  }

  return await new Promise((resolve) => {
    cookies.get({ url: X_ORIGIN, name: "ct0" }, (cookie) => {
      const extensionGlobal = globalThis as BrowserExtensionGlobal
      if (extensionGlobal.chrome?.runtime?.lastError) {
        resolve(undefined)
        return
      }

      resolve(cookie?.value)
    })
  })
}

async function createXLoggedInHeaders(): Promise<Record<string, string>> {
  const csrfToken = await getXCsrfToken()

  return {
    ...createXHeaders(),
    "x-twitter-auth-type": "OAuth2Session",
    ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
  }
}

function normalizeXSearchUrl(url: string): string {
  return url.replace(/^http:\/\/twitter\.com\//, "https://x.com/")
}

function normalizeXUsername(username: string): string {
  return username.trim().replace(/^@/, "").replace(/^https?:\/\/(?:www\.)?(?:x|twitter)\.com\//, "").split(/[/?#]/)[0] ?? ""
}

function isUserTweetEntry(entry: XTimelineEntry): boolean {
  return Boolean(entry.entryId && USER_TWEET_ENTRY_PREFIXES.some(prefix => entry.entryId?.startsWith(prefix)))
}

function getTweetResult(entry: XTimelineEntry): XTweetResult | undefined {
  const result = entry.content?.itemContent?.tweet_results?.result
  if (!result || result.__typename === "TweetTombstone") {
    return undefined
  }

  return result.tweet ?? result
}

function getTimelineEntries(instructions: XTimelineInstruction[]): XTimelineEntry[] {
  return instructions.flatMap((instruction) => {
    if (instruction.entry) {
      return [instruction.entry]
    }

    return instruction.entries ?? []
  })
}

function entriesToNewsItems(entries: XTimelineEntry[]): NewsItem[] {
  const seen = new Set<string>()
  const items: NewsItem[] = []

  for (const entry of entries) {
    const tweet = getTweetResult(entry)
    const item = tweet ? xTweetToNewsItem(tweet) : undefined
    if (!item || seen.has(item.url)) {
      continue
    }

    seen.add(item.url)
    items.push(item)
  }

  return items
}

function sortNewsItemsByNewest(items: NewsItem[]): NewsItem[] {
  return items.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
}

function getTweetText(tweet: XTweetResult): string | undefined {
  return tweet.note_tweet?.note_tweet_results?.result?.text ?? tweet.legacy?.full_text
}

function formatLikeCount(count: number): string {
  const formattedCount = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(count)

  return `${formattedCount} ${count === 1 ? "like" : "likes"}`
}

function xTweetToNewsItem(tweet: XTweetResult): NewsItem | undefined {
  const id = tweet.rest_id
  const user = tweet.core?.user_results?.result?.legacy
  const screenName = user?.screen_name
  const text = getTweetText(tweet)
  if (!id || !screenName || !text) {
    return undefined
  }

  const createdAt = tweet.legacy?.created_at
  const timestamp = createdAt ? new Date(createdAt).getTime() : undefined
  const pictures = tweet.legacy?.entities?.media
    ?.map(media => media.media_url_https)
    .filter((url): url is string => Boolean(url))

  const item: NewsItem = {
    title: text,
    url: `${X_ORIGIN}/${screenName}/status/${id}`,
    inline: {
      text: formatLikeCount(tweet.legacy?.favorite_count ?? 0),
      ...(user.profile_image_url_https ? { icon: { src: user.profile_image_url_https, radius: 999 } } : {}),
    },
  }

  if (timestamp !== undefined && !Number.isNaN(timestamp)) {
    item.timestamp = timestamp
  }

  if (pictures && pictures.length > 0) {
    item.preview = {
      text,
      picture: pictures,
    }
  }

  return item
}

export async function fetchXPlaceTrends({ location }: XTrendingParams): Promise<NewsItem[]> {
  const headers = await createXLoggedInHeaders()

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

export async function fetchXTimeline(url: string): Promise<NewsItem[]> {
  const headers = await createXLoggedInHeaders()
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

export async function fetchXUserTweets({ username }: XUserTweetsParams): Promise<NewsItem[]> {
  const screenName = normalizeXUsername(username)
  const headers = await createXLoggedInHeaders()

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
  sources: [
    $source(
      {
        key: "default",
        title: "Trending",
        type: "hottest",
        params: {
          location: $selectParam<LocationId>({
            title: "Location",
            options: [...LOCATION_OPTIONS],
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
      () => fetchXTimeline(HOME_TIMELINE_URL),
    ),
    $source(
      {
        key: "following",
        title: "Following",
        type: "timeline",
      },
      () => fetchXTimeline(HOME_LATEST_TIMELINE_URL),
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
