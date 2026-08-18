import type { NewsItemInput, SourceLoaderContext } from "@newsnext/source-kit/types"
import type {
  XTimelineEntry,
  XTimelineInstruction,
  XTweetResult,
  XTweetTextMode,
} from "./types"

export const X_ORIGIN = "https://x.com"
export const X_ITEM_TEMPLATE = {
  inline: "{% unless scope.item.icon.kind == 'author' %}{{ scope.item.author.name }}{% endunless %}",
} as const
export const PLACE_TRENDS_URL = "https://api.x.com/1.1/trends/place.json"
export const HOME_LATEST_TIMELINE_QUERY_ID = "BLQWpfVqtgBqAqwRRJcJjA"
export const HOME_LATEST_TIMELINE_URL = `${X_ORIGIN}/i/api/graphql/${HOME_LATEST_TIMELINE_QUERY_ID}/HomeLatestTimeline`
export const LIST_LATEST_TWEETS_URL = `${X_ORIGIN}/i/api/graphql/1LE3u14FJjPZUHKFGzos2g/ListLatestTweetsTimeline`
export const USER_BY_SCREEN_NAME_URL = `${X_ORIGIN}/i/api/graphql/Gb-d6r0vxPOADdG62OEBpQ/UserByScreenName`
export const USER_TWEETS_URL = `${X_ORIGIN}/i/api/graphql/SXVCYB8XHSS25nzIljNtZA/UserTweets`
export const X_CSRF_TOKEN_SECRET_KEY = "csrfToken"
export const X_TIMELINE_COUNT = 50

const X_BEARER_TOKEN = "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
const USER_TWEET_ENTRY_PREFIXES = ["tweet-", "profile-conversation-"]

export function parseXUserIdCookie(value: string | undefined): string | undefined {
  if (!value) return undefined
  try {
    return decodeURIComponent(value).match(/^u=(\d+)$/)?.[1]
  } catch {
    return undefined
  }
}

export const X_TIMELINE_FEATURES = {
  rweb_video_screen_enabled: false,
  rweb_cashtags_enabled: true,
  profile_label_improvements_pcf_label_in_post_enabled: true,
  responsive_web_profile_redirect_enabled: true,
  rweb_tipjar_consumption_enabled: false,
  verified_phone_label_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_timeline_navigation_enabled: true,
  premium_content_api_read_enabled: false,
  communities_web_enable_tweet_community_results_fetch: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  responsive_web_grok_analyze_button_fetch_trends_enabled: false,
  responsive_web_grok_analyze_post_followups_enabled: true,
  rweb_cashtags_composer_attachment_enabled: true,
  responsive_web_jetfuel_frame: true,
  responsive_web_grok_share_attachment_enabled: true,
  responsive_web_grok_annotations_enabled: true,
  articles_preview_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  rweb_conversational_replies_downvote_enabled: false,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  content_disclosure_indicator_enabled: true,
  content_disclosure_ai_generated_indicator_enabled: true,
  responsive_web_grok_show_grok_translated_post: true,
  responsive_web_grok_analysis_button_from_backend: true,
  post_ctas_fetch_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: false,
  responsive_web_grok_image_annotation_enabled: true,
  responsive_web_grok_imagine_annotation_enabled: true,
  responsive_web_grok_community_note_auto_translation_is_enabled: true,
  responsive_web_enhance_cards_enabled: false,
}

export const X_USER_FEATURES = {
  hidden_profile_subscriptions_enabled: true,
  profile_label_improvements_pcf_label_in_post_enabled: true,
  responsive_web_profile_redirect_enabled: true,
  rweb_tipjar_consumption_enabled: false,
  verified_phone_label_enabled: false,
  subscriptions_verification_info_is_identity_verified_enabled: true,
  subscriptions_verification_info_verified_since_enabled: true,
  highlights_tweets_tab_ui_enabled: true,
  responsive_web_twitter_article_notes_tab_enabled: true,
  subscriptions_feature_can_gift_premium: true,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_timeline_navigation_enabled: true,
}

export function createXLoggedInHeaders(context: SourceLoaderContext): Record<string, string> {
  const csrfToken = context.secrets?.[X_CSRF_TOKEN_SECRET_KEY]
  const headers: Record<string, string> = {
    "authorization": `Bearer ${X_BEARER_TOKEN}`,
    "content-type": "application/json",
    "referer": X_ORIGIN,
    "x-twitter-active-user": "yes",
    "x-twitter-auth-type": "OAuth2Session",
  }
  if (csrfToken) headers["x-csrf-token"] = csrfToken
  return headers
}

export function normalizeXSearchUrl(url: string): string {
  return url.replace(/^http:\/\/twitter\.com\//, "https://x.com/")
}

export function isUserTweetEntry(entry: XTimelineEntry): boolean {
  return Boolean(entry.entryId && USER_TWEET_ENTRY_PREFIXES.some(prefix => entry.entryId?.startsWith(prefix)))
}

function getTweetResult(entry: XTimelineEntry): XTweetResult | undefined {
  const result = entry.content?.itemContent?.tweet_results?.result
  if (!result || result.__typename === "TweetTombstone") return undefined
  return result.tweet ?? result
}

export function getTimelineEntries(instructions: XTimelineInstruction[]): XTimelineEntry[] {
  return instructions.flatMap((instruction) => {
    const entries = instruction.entry ? [instruction.entry] : instruction.entries ?? []
    return entries.flatMap(entry => [
      entry,
      ...(entry.content?.items?.map(item => ({
        entryId: item.entryId,
        content: item.item,
      })) ?? []),
    ])
  })
}

function xTweetToNewsItem(
  tweet: XTweetResult,
  includeIcon: boolean,
  textMode: XTweetTextMode,
): NewsItemInput | undefined {
  const id = tweet.rest_id
  const user = tweet.core?.user_results?.result
  const screenName = user?.core?.screen_name
  const authorName = user?.core?.name ?? `@${screenName}`
  const profileImage = user?.avatar?.image_url
  const originalText = tweet.note_tweet?.note_tweet_results?.result?.text ?? tweet.legacy?.full_text
  const translationResult = tweet.grok_translated_post_with_availability
  const translatedText = translationResult?.is_available
    ? translationResult.data?.translation
    : undefined
  const title = textMode === "translation"
    ? translatedText ?? originalText
    : originalText ?? translatedText
  const alternateText = title === translatedText ? originalText : translatedText
  if (!id || !screenName || !title) return undefined

  const favoriteCount = tweet.legacy?.favorite_count ?? 0
  const timestamp = tweet.legacy?.created_at ? Date.parse(tweet.legacy.created_at) : Number.NaN
  const pictures = tweet.legacy?.entities?.media
    ?.map(media => media.media_url_https)
    .filter((url): url is string => Boolean(url))
  return {
    title,
    url: `${X_ORIGIN}/${screenName}/status/${id}`,
    publishedAt: timestamp,
    author: {
      name: authorName,
      home: `${X_ORIGIN}/${screenName}`,
    },
    stats: {
      likes: favoriteCount,
      comments: tweet.legacy?.reply_count,
      reposts: tweet.legacy?.retweet_count,
    },
    icon: {
      kind: "author",
      label: authorName,
      src: includeIcon ? profileImage : undefined,
    },
    content: {
      text: alternateText,
      pictures,
    },
  }
}

export function entriesToNewsItems(
  entries: XTimelineEntry[],
  options: { includeIcon?: boolean, textMode?: XTweetTextMode } = {},
): NewsItemInput[] {
  const { includeIcon = true, textMode = "original" } = options
  const seen = new Set<string>()
  return entries.flatMap((entry): NewsItemInput[] => {
    const tweet = getTweetResult(entry)
    const item = tweet ? xTweetToNewsItem(tweet, includeIcon, textMode) : undefined
    if (!item || seen.has(item.url)) return []
    seen.add(item.url)
    return [item]
  })
}

export function sortNewsItemsByNewest(items: NewsItemInput[]): NewsItemInput[] {
  return items.sort((a, b) => (b.publishedAt ?? b.updatedAt ?? 0) - (a.publishedAt ?? a.updatedAt ?? 0))
}
