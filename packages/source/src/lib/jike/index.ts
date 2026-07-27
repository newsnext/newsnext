import type { NewsItem, SourceLoaderContext } from "@newsnext/source/typings"
import type { ProviderConfig } from "@newsnext/source/utils/source"
import type { JikeFeedResponse, TopicFeedOrder } from "./types"
import { myFetch } from "@newsnext/source/utils/fetch"
import { isJwtExpired } from "@newsnext/source/utils/jwt"
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
const JIKE_ACCESS_TOKEN_SECRET_KEY = "accessToken"
const JIKE_REFRESH_TOKEN_SECRET_KEY = "refreshToken"
const JIKE_ACCESS_TOKEN_EXPIRY_BUFFER_SECONDS = 30

async function refreshJikeAccessToken(
  refreshToken: string | undefined,
  context: SourceLoaderContext | undefined,
): Promise<string | undefined> {
  if (!refreshToken) return undefined

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
    if (!response.ok) return undefined

    const accessToken = response.headers.get("x-jike-access-token")?.trim()
    if (!accessToken) return undefined
    await context?.updateSecrets?.({
      [JIKE_ACCESS_TOKEN_SECRET_KEY]: accessToken,
    })
    return accessToken
  } catch {
    return undefined
  }
}

async function requestJikeFeed(
  url: string,
  body: Record<string, unknown>,
  accessToken: string,
): Promise<JikeFeedResponse> {
  return myFetch<JikeFeedResponse>(url, {
    method: "POST",
    credentials: "include",
    headers: createJikeHeaders(accessToken),
    body,
  })
}

async function fetchJikeWithAuth(
  url: string,
  body: Record<string, unknown>,
  context?: SourceLoaderContext,
): Promise<JikeFeedResponse> {
  const refreshToken = context?.secrets?.[JIKE_REFRESH_TOKEN_SECRET_KEY]?.trim()
  if (!refreshToken) throw new Error("Jike refreshToken secret is required.")

  const storedAccessToken = context?.secrets?.[JIKE_ACCESS_TOKEN_SECRET_KEY]?.trim()
  const accessToken = !storedAccessToken
    || isJwtExpired(storedAccessToken, { bufferSeconds: JIKE_ACCESS_TOKEN_EXPIRY_BUFFER_SECONDS })
    ? await refreshJikeAccessToken(refreshToken, context) ?? storedAccessToken
    : storedAccessToken
  if (!accessToken) throw new Error("Jike accessToken refresh failed.")

  try {
    return await requestJikeFeed(url, body, accessToken)
  } catch (error) {
    if (!isJikeAuthFetchError(error)) throw error
    const refreshedAccessToken = await refreshJikeAccessToken(refreshToken, context)
    if (!refreshedAccessToken) throw error
    return requestJikeFeed(url, body, refreshedAccessToken)
  }
}

function assertSuccessfulFeed(response: JikeFeedResponse, fallback: string): void {
  if (response.success === false) {
    throw new Error(response.error?.message ?? response.toast ?? fallback)
  }
}

export async function fetchJikeFollowingUpdates(
  _params: Record<string, unknown> = {},
  context?: SourceLoaderContext,
): Promise<NewsItem[]> {
  const response = await fetchJikeWithAuth(
    FOLLOWING_UPDATES_URL,
    { limit: FOLLOWING_UPDATES_LIMIT },
    context,
  )
  assertSuccessfulFeed(response, "Failed to load Jike following updates.")
  return jikePostsToNewsItems(response.data ?? [])
}

export async function fetchJikeUserUpdates(
  { username }: { username: string },
  context?: SourceLoaderContext,
): Promise<NewsItem[]> {
  const response = await fetchJikeWithAuth(
    USER_UPDATES_URL,
    { limit: FOLLOWING_UPDATES_LIMIT, username: username.trim() },
    context,
  )
  assertSuccessfulFeed(response, "Failed to load Jike user updates.")
  return jikePostsToNewsItems((response.data ?? []).filter(post => !isPinnedPersonalUpdate(post)))
}

async function fetchJikeTopicFeed(
  { topicId }: { topicId: string },
  order: TopicFeedOrder,
  context?: SourceLoaderContext,
): Promise<NewsItem[]> {
  const response = await fetchJikeWithAuth(
    buildJikeTopicFeedUrl(order),
    { limit: FOLLOWING_UPDATES_LIMIT, topicId: topicId.trim() },
    context,
  )
  assertSuccessfulFeed(response, "Failed to load Jike topic feed.")
  return jikePostsToNewsItems(response.data ?? [])
}

const jikeCapabilities = {
  network: ["api.ruguoapp.com"],
  cookies: ["api.ruguoapp.com", "web.okjike.com"],
}
const topicIdParam = {
  type: "text",
  title: "Topic ID",
  default: "5aeaa84029e4000011ac3768",
  pattern: ".+",
} as const
const topicRadar = {
  match: {
    hosts: ["web.okjike.com"],
    paths: ["/topic/:topicId/*rest"],
  },
  patch: {
    params: {
      topicId: "{{ path.topicId }}",
    },
    metadata: {
      title: "{{ page.title | normalize_whitespace | regex_extract: '^(.+?)(?:\\\\s*[-_—|]\\\\s*即刻.*)?$', 1 | default: params.topicId }}",
    },
  },
}

export default {
  title: "Jike",
  defaults: {
    capabilities: jikeCapabilities,
    cache: "5m",
    loader: {
      type: "custom",
    },
    metadata: {
      home: JIKE_WEB_ORIGIN,
      color: "yellow",
      type: "timeline",
    },
    secrets: [
      {
        key: JIKE_ACCESS_TOKEN_SECRET_KEY,
        type: "localStorage",
        origin: JIKE_WEB_ORIGIN,
        itemKey: "JK_ACCESS_TOKEN",
      },
      {
        key: JIKE_REFRESH_TOKEN_SECRET_KEY,
        type: "localStorage",
        origin: JIKE_WEB_ORIGIN,
        itemKey: "JK_REFRESH_TOKEN",
      },
    ],
  },
  sources: {
    "following-updates": {
      metadata: {
        title: "Following Updates",
        desc: "Updates from followed Jike users",
      },
      radar: [
        {
          id: "jike-following-updates",
          match: {
            hosts: ["web.okjike.com"],
            paths: ["/following"],
          },
          confidence: 0.95,
        },
      ],
      loader: {
        load: fetchJikeFollowingUpdates,
      },
    },
    "user-updates": {
      metadata: {
        title: "User Updates",
        desc: "Updates from a Jike user",
      },
      radar: [
        {
          id: "jike-user-profile",
          match: {
            hosts: ["web.okjike.com"],
            paths: ["/u/:username/*rest"],
          },
          patch: {
            params: {
              username: "{{ path.username }}",
            },
            metadata: {
              title: "{{ page.title | normalize_whitespace | regex_replace: '[:：].*$', '' | regex_replace: '的主页\\\\s*[-_—|]\\\\s*即刻.*$', '' | default: params.username }}",
            },
          },
          confidence: 0.9,
        },
      ],
      params: {
        username: {
          type: "text",
          title: "Username",
          default: "7f422d5d-d79a-4f45-9880-b89d64d7f37a",
          pattern: ".+",
        },
      },
      loader: {
        load: fetchJikeUserUpdates,
      },
    },
    "topic-recent": {
      metadata: {
        title: "Topic Recent",
        desc: "Recent posts from a Jike topic",
      },
      radar: [
        {
          id: "jike-topic-recent",
          ...topicRadar,
          confidence: 0.9,
        },
      ],
      params: {
        topicId: topicIdParam,
      },
      loader: {
        load: (params, context) => fetchJikeTopicFeed(params, "recent", context),
      },
    },
    "topic-hottest": {
      metadata: {
        title: "Topic Hottest",
        desc: "Hottest posts from a Jike topic",
        type: "hottest",
      },
      radar: [
        {
          id: "jike-topic-hottest",
          ...topicRadar,
          confidence: 0.85,
        },
      ],
      params: {
        topicId: topicIdParam,
      },
      loader: {
        load: (params, context) => fetchJikeTopicFeed(params, "hottest", context),
      },
    },
  },
} satisfies ProviderConfig
