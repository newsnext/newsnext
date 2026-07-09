import type { NewsItem, SourceLoaderContext } from "@newsnext/source-shared/typings"
import type {
  JikeFeedResponse,
  JikeRequestOptions,
  JikeTopicFeedParams,
  JikeUserUpdatesParams,
  TopicFeedOrder,
} from "./types"
import { myFetch } from "@newsnext/source-shared/utils/fetch"
import { isJwtExpired } from "@newsnext/source-shared/utils/jwt"
import { $textParam } from "@newsnext/source-shared/utils/params"
import { $radar, pageTitle } from "@newsnext/source-shared/utils/radar"

import { $provider, $source } from "@newsnext/source-shared/utils/source"

import {
  buildJikeTopicFeedUrl,
  createJikeHeaders,
  isJikeAuthFetchError,
  isPinnedPersonalUpdate,
  JIKE_WEB_ORIGIN,
  jikePostsToNewsItems,
} from "./utils"

export { jikePostsToNewsItems } from "./utils"

const REFRESH_AUTH_TOKEN_URL = "https://api.ruguoapp.com/app_auth_tokens.refresh"
const FOLLOWING_UPDATES_URL = "https://api.ruguoapp.com/1.0/personalUpdate/followingUpdates"
const USER_UPDATES_URL = "https://api.ruguoapp.com/1.0/personalUpdate/single"
const FOLLOWING_UPDATES_LIMIT = 50
const JIKE_ACCESS_TOKEN_STORAGE_KEY = "JK_ACCESS_TOKEN"
const JIKE_REFRESH_TOKEN_STORAGE_KEY = "JK_REFRESH_TOKEN"
const JIKE_ACCESS_TOKEN_SECRET_KEY = "accessToken"
const JIKE_REFRESH_TOKEN_SECRET_KEY = "refreshToken"
const JIKE_ACCESS_TOKEN_EXPIRY_BUFFER_SECONDS = 30

const JIKE_AUTH_SECRETS = [
  {
    key: JIKE_ACCESS_TOKEN_SECRET_KEY,
    type: "localStorage",
    origin: JIKE_WEB_ORIGIN,
    itemKey: JIKE_ACCESS_TOKEN_STORAGE_KEY,
  },
  {
    key: JIKE_REFRESH_TOKEN_SECRET_KEY,
    type: "localStorage",
    origin: JIKE_WEB_ORIGIN,
    itemKey: JIKE_REFRESH_TOKEN_STORAGE_KEY,
  },
] as const

async function refreshJikeAccessToken(
  refreshToken: string | undefined,
  context: SourceLoaderContext | undefined,
): Promise<string | undefined> {
  if (!refreshToken) {
    return undefined
  }

  try {
    const response = await fetch(REFRESH_AUTH_TOKEN_URL, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "platform": "web",
        "x-jike-refresh-token": refreshToken,
      },
      body: "{}",
    })

    if (!response.ok) {
      return undefined
    }

    const refreshedAccessToken = response.headers.get("x-jike-access-token")?.trim()
    if (!refreshedAccessToken) {
      return undefined
    }

    await context?.updateSecrets?.({
      [JIKE_ACCESS_TOKEN_SECRET_KEY]: refreshedAccessToken,
    })

    return refreshedAccessToken
  } catch {
    return undefined
  }
}

function getJikeAccessTokenFromContext(context: SourceLoaderContext | undefined): string | undefined {
  const accessToken = context?.secrets?.[JIKE_ACCESS_TOKEN_SECRET_KEY]?.trim()
  return accessToken || undefined
}

function getJikeRefreshTokenFromContext(context: SourceLoaderContext | undefined): string | undefined {
  const refreshToken = context?.secrets?.[JIKE_REFRESH_TOKEN_SECRET_KEY]?.trim()
  return refreshToken || undefined
}

async function requestJikeFeed(url: string, options: JikeRequestOptions, accessToken: string): Promise<JikeFeedResponse> {
  return await myFetch<JikeFeedResponse>(url, {
    method: "POST",
    credentials: "include",
    headers: createJikeHeaders(accessToken),
    body: options.body,
  })
}

async function fetchJikeWithAuth(url: string, options: JikeRequestOptions, context?: SourceLoaderContext): Promise<JikeFeedResponse> {
  const refreshToken = getJikeRefreshTokenFromContext(context)
  if (!refreshToken) {
    throw new Error("Jike refreshToken secret is required.")
  }

  const accessToken = getJikeAccessTokenFromContext(context)
  const requestAccessToken = !accessToken || isJwtExpired(accessToken, { bufferSeconds: JIKE_ACCESS_TOKEN_EXPIRY_BUFFER_SECONDS })
    ? await refreshJikeAccessToken(refreshToken, context) ?? accessToken
    : accessToken

  if (!requestAccessToken) {
    throw new Error("Jike accessToken refresh failed.")
  }

  try {
    return await requestJikeFeed(url, options, requestAccessToken)
  } catch (error) {
    if (!isJikeAuthFetchError(error)) {
      throw error
    }

    const refreshedAccessToken = await refreshJikeAccessToken(refreshToken, context)
    if (!refreshedAccessToken) {
      throw error
    }

    return await requestJikeFeed(url, options, refreshedAccessToken)
  }
}

export async function fetchJikeFollowingUpdates(_params: Record<string, unknown> = {}, context?: SourceLoaderContext): Promise<NewsItem[]> {
  const response = await fetchJikeWithAuth(FOLLOWING_UPDATES_URL, {
    body: {
      limit: FOLLOWING_UPDATES_LIMIT,
    },
  }, context)

  if (response.success === false) {
    throw new Error(response.error?.message ?? response.toast ?? "Failed to load Jike following updates.")
  }

  return jikePostsToNewsItems(response.data ?? [])
}

export async function fetchJikeUserUpdates({
  username,
}: JikeUserUpdatesParams, context?: SourceLoaderContext): Promise<NewsItem[]> {
  const response = await fetchJikeWithAuth(USER_UPDATES_URL, {
    body: {
      limit: FOLLOWING_UPDATES_LIMIT,
      username: username.trim(),
    },
  }, context)

  if (response.success === false) {
    throw new Error(response.error?.message ?? response.toast ?? "Failed to load Jike user updates.")
  }

  return jikePostsToNewsItems((response.data ?? []).filter(post => !isPinnedPersonalUpdate(post)))
}

async function fetchJikeTopicFeedByOrder({
  topicId,
  order,
}: JikeTopicFeedParams & { order: TopicFeedOrder }, context?: SourceLoaderContext): Promise<NewsItem[]> {
  const response = await fetchJikeWithAuth(buildJikeTopicFeedUrl(order), {
    body: {
      limit: FOLLOWING_UPDATES_LIMIT,
      topicId: topicId.trim(),
    },
  }, context)

  if (response.success === false) {
    throw new Error(response.error?.message ?? response.toast ?? "Failed to load Jike topic feed.")
  }

  return jikePostsToNewsItems(response.data ?? [])
}

export async function fetchJikeTopicRecentFeed(params: JikeTopicFeedParams, context?: SourceLoaderContext): Promise<NewsItem[]> {
  return fetchJikeTopicFeedByOrder({ ...params, order: "recent" }, context)
}

export async function fetchJikeTopicHottestFeed(params: JikeTopicFeedParams, context?: SourceLoaderContext): Promise<NewsItem[]> {
  return fetchJikeTopicFeedByOrder({ ...params, order: "hottest" }, context)
}

export default $provider({
  title: "Jike",
  home: JIKE_WEB_ORIGIN,
  color: "yellow",
  icon: `${JIKE_WEB_ORIGIN}/favicon.ico`,
  secrets: [...JIKE_AUTH_SECRETS],
  sources: [
    $source(
      {
        key: "following-updates",
        title: "Following updates",
        desc: "Updates from followed Jike users",
        type: "timeline",
        category: "others",
        radar: [
          $radar({
            id: "jike-following-updates",
            hosts: ["web.okjike.com"],
            path: "/following",
            confidence: 0.95,
          }),
        ],
      },
      fetchJikeFollowingUpdates,
    ),
    $source(
      {
        key: "user-updates",
        title: "User updates",
        desc: "Updates from a Jike user",
        type: "timeline",
        category: "others",
        radar: [
          $radar({
            id: "jike-user-profile",
            hosts: ["web.okjike.com"],
            path: "/u/:username{/*rest}",
            meta: {
              title: pageTitle()
                .normalize()
                .replace("[:：].*$", "")
                .replace("的主页\\s*[-_—|]\\s*即刻.*$", "")
                .fallback("{username}"),
            },
            confidence: 0.9,
          }),
        ],
        params: {
          username: $textParam({
            title: "Username",
            default: "7f422d5d-d79a-4f45-9880-b89d64d7f37a",
            validate: value => value.trim().length > 0 || "Username is required",
          }),
        },
      },
      fetchJikeUserUpdates,
    ),
    $source(
      {
        key: "topic-recent",
        title: "Topic recent",
        desc: "Recent posts from a Jike topic",
        type: "timeline",
        category: "others",
        radar: [
          $radar({
            id: "jike-topic-recent",
            hosts: ["web.okjike.com"],
            path: "/topic/:topicId{/*rest}",
            meta: {
              title: pageTitle()
                .normalize()
                .extract("^(.+?)(?:\\s*[-_—|]\\s*即刻.*)?$", { fallbackToEmpty: true })
                .fallback("Topic {topicId}"),
            },
            confidence: 0.9,
          }),
        ],
        params: {
          topicId: $textParam({
            title: "Topic ID",
            default: "5aeaa84029e4000011ac3768",
            validate: value => value.trim().length > 0 || "Topic ID is required",
          }),
        },
      },
      fetchJikeTopicRecentFeed,
    ),
    $source(
      {
        key: "topic-hottest",
        title: "Topic hottest",
        desc: "Hottest posts from a Jike topic",
        type: "hottest",
        category: "others",
        radar: [
          $radar({
            id: "jike-topic-hottest",
            hosts: ["web.okjike.com"],
            path: "/topic/:topicId{/*rest}",
            meta: {
              title: pageTitle()
                .normalize()
                .extract("^(.+?)(?:\\s*[-_—|]\\s*即刻.*)?$", { fallbackToEmpty: true })
                .fallback("Topic {topicId}"),
            },
            confidence: 0.85,
          }),
        ],
        params: {
          topicId: $textParam({
            title: "Topic ID",
            default: "5aeaa84029e4000011ac3768",
            validate: value => value.trim().length > 0 || "Topic ID is required",
          }),
        },
      },
      fetchJikeTopicHottestFeed,
    ),
  ],
})
