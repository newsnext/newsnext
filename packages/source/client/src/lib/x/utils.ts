import type { NewsItem, SourceLoaderContext } from "@newsnext/source-shared/typings"

import type { XTimelineEntry, XTimelineInstruction, XTweetResult } from "./types"

export const X_ORIGIN = "https://x.com"
export const PLACE_TRENDS_URL = "https://api.x.com/1.1/trends/place.json"
export const HOME_TIMELINE_URL = `${X_ORIGIN}/i/api/graphql/-X_hcgQzmHGl29-UXxz4sw/HomeTimeline`
export const HOME_LATEST_TIMELINE_URL = `${X_ORIGIN}/i/api/graphql/U0cdisy7QFIoTfu3-Okw0A/HomeLatestTimeline`
export const USER_BY_SCREEN_NAME_URL = `${X_ORIGIN}/i/api/graphql/NimuplG1OB7Fd2btCLdBOw/UserByScreenName`
export const USER_TWEETS_URL = `${X_ORIGIN}/i/api/graphql/QWF3SzpHmykQHsQMixG0cg/UserTweets`
export const HOME_TIMELINE_COUNT = 20
export const USER_TWEETS_COUNT = 40
export const X_CSRF_TOKEN_SECRET_KEY = "csrfToken"

const X_BEARER_TOKEN = "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
const USER_TWEET_ENTRY_PREFIXES = ["tweet-", "profile-conversation-", "profile-grid-"]

export const X_FEATURES = {
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

export const X_USER_FEATURES = {
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

function createXHeaders(): Record<string, string> {
  return {
    "authorization": `Bearer ${X_BEARER_TOKEN}`,
    "content-type": "application/json",
    "referer": X_ORIGIN,
    "x-twitter-active-user": "yes",
  }
}

export async function createXLoggedInHeaders(context?: SourceLoaderContext): Promise<Record<string, string>> {
  const csrfToken = context?.secrets?.[X_CSRF_TOKEN_SECRET_KEY]

  return {
    ...createXHeaders(),
    "x-twitter-auth-type": "OAuth2Session",
    ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
  }
}

export function normalizeXSearchUrl(url: string): string {
  return url.replace(/^http:\/\/twitter\.com\//, "https://x.com/")
}

export function normalizeXUsername(username: string): string {
  return username.trim().replace(/^@/, "").replace(/^https?:\/\/(?:www\.)?(?:x|twitter)\.com\//, "").split(/[/?#]/)[0] ?? ""
}

export function isUserTweetEntry(entry: XTimelineEntry): boolean {
  return Boolean(entry.entryId && USER_TWEET_ENTRY_PREFIXES.some(prefix => entry.entryId?.startsWith(prefix)))
}

function getTweetResult(entry: XTimelineEntry): XTweetResult | undefined {
  const result = entry.content?.itemContent?.tweet_results?.result
  if (!result || result.__typename === "TweetTombstone") {
    return undefined
  }

  return result.tweet ?? result
}

export function getTimelineEntries(instructions: XTimelineInstruction[]): XTimelineEntry[] {
  return instructions.flatMap((instruction) => {
    if (instruction.entry) {
      return [instruction.entry]
    }

    return instruction.entries ?? []
  })
}

export function entriesToNewsItems(entries: XTimelineEntry[]): NewsItem[] {
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

export function sortNewsItemsByNewest(items: NewsItem[]): NewsItem[] {
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
