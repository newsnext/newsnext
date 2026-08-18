import type { ProviderConfig } from "@newsnext/source-kit/registry"
import type {
  SourceLoaderContext,
  SourceLoaderOutput,
} from "@newsnext/source-kit/types"
import type { JikeFeedResponse, TopicFeedOrder } from "./types"
import { isJwtExpired } from "@newsnext/source-kit/utils"
import {
  buildJikeTopicFeedUrl,
  createJikeHeaders,
  getJikeUserAvatar,
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
const JIKE_ITEM_TEMPLATE = {
  inline: "{% unless scope.item.icon.kind == 'author' %}{{ scope.item.author.name }}{% if scope.item.attributes.topic %} · {% endif %}{% endunless %}{% if scope.item.attributes.topic %}#{{ scope.item.attributes.topic }}{% endif %}",
} as const
const JIKE_USER_ITEM_TEMPLATE = {
  inline: "#{{ scope.item.attributes.topic }}",
} as const
const JIKE_TOPIC_ITEM_TEMPLATE = {
  inline: "{% unless scope.item.icon.kind == 'author' %}{{ scope.item.author.name }}{% endunless %}",
} as const
const JIKE_ACCESS_TOKEN_EXPIRY_BUFFER_SECONDS = 30

async function refreshJikeAccessToken(
  refreshToken: string | undefined,
  context: SourceLoaderContext,
): Promise<string | undefined> {
  if (!refreshToken) return undefined

  try {
    const response = await context.fetch.post(REFRESH_AUTH_TOKEN_URL, {
      headers: {
        "platform": "web",
        "x-jike-refresh-token": refreshToken,
      },
      json: {},
    })

    const accessToken = response.headers.get("x-jike-access-token")?.trim()
    if (!accessToken) return undefined
    await context.updateSecrets?.({
      [JIKE_ACCESS_TOKEN_SECRET_KEY]: accessToken,
    })
    return accessToken
  } catch {
    context.signal.throwIfAborted()
    return undefined
  }
}

async function fetchJikeWithAuth(
  url: string,
  body: Record<string, unknown>,
  context: SourceLoaderContext,
): Promise<JikeFeedResponse> {
  const refreshToken = context.secrets?.[JIKE_REFRESH_TOKEN_SECRET_KEY]?.trim()
  if (!refreshToken) throw new Error("Jike refreshToken secret is required.")

  const storedAccessToken = context.secrets?.[JIKE_ACCESS_TOKEN_SECRET_KEY]?.trim()
  let accessToken = !storedAccessToken
    || isJwtExpired(storedAccessToken, { bufferSeconds: JIKE_ACCESS_TOKEN_EXPIRY_BUFFER_SECONDS })
    ? await refreshJikeAccessToken(refreshToken, context) ?? storedAccessToken
    : storedAccessToken
  if (!accessToken) throw new Error("Jike accessToken refresh failed.")

  const jikeFetch = context.fetch.extend({
    hooks: {
      afterResponse: [async ({ request, response, retryCount }) => {
        if (![401, 403].includes(response.status) || retryCount > 0) return

        const refreshedAccessToken = await refreshJikeAccessToken(refreshToken, context)
        if (!refreshedAccessToken) return
        accessToken = refreshedAccessToken

        const headers = new Headers(request.headers)
        headers.set("x-jike-access-token", refreshedAccessToken)
        return context.fetch.retry({
          code: "JIKE_TOKEN_REFRESHED",
          request: new Request(request, { headers }),
        })
      }],
    },
  })

  return jikeFetch.post(url, {
    headers: createJikeHeaders(accessToken),
    json: body,
  }).json<JikeFeedResponse>()
}

function assertSuccessfulFeed(response: JikeFeedResponse, fallback: string): void {
  if (response.success === false) {
    throw new Error(response.error?.message ?? response.toast ?? fallback)
  }
}

export async function fetchJikeFollowingUpdates(
  _params: unknown,
  context: SourceLoaderContext,
): Promise<SourceLoaderOutput> {
  const response = await fetchJikeWithAuth(
    FOLLOWING_UPDATES_URL,
    { limit: FOLLOWING_UPDATES_LIMIT },
    context,
  )
  assertSuccessfulFeed(response, "Failed to load Jike following updates.")
  return { items: jikePostsToNewsItems(response.data ?? []), itemTemplate: JIKE_ITEM_TEMPLATE }
}

export async function fetchJikeUserUpdates(
  { username }: { username: string },
  context: SourceLoaderContext,
): Promise<SourceLoaderOutput> {
  const response = await fetchJikeWithAuth(
    USER_UPDATES_URL,
    { limit: FOLLOWING_UPDATES_LIMIT, username: username.trim() },
    context,
  )
  assertSuccessfulFeed(response, "Failed to load Jike user updates.")
  const posts = (response.data ?? []).filter(post => !isPinnedPersonalUpdate(post))
  const badge = getJikeUserAvatar(posts.find(post => post.user)?.user)
  return {
    items: jikePostsToNewsItems(posts, { includeIcon: false }),
    itemTemplate: JIKE_USER_ITEM_TEMPLATE,
    metadata: badge ? { badge } : undefined,
  }
}

async function fetchJikeTopicFeed(
  { topicId, order }: { topicId: string, order: TopicFeedOrder },
  context: SourceLoaderContext,
): Promise<SourceLoaderOutput> {
  const response = await fetchJikeWithAuth(
    buildJikeTopicFeedUrl(order),
    { limit: FOLLOWING_UPDATES_LIMIT, topicId: topicId.trim() },
    context,
  )
  assertSuccessfulFeed(response, "Failed to load Jike topic feed.")
  return { items: jikePostsToNewsItems(response.data ?? []), itemTemplate: JIKE_TOPIC_ITEM_TEMPLATE }
}

const jikeCapabilities = {
  network: ["api.ruguoapp.com"],
  cookies: ["api.ruguoapp.com", "web.okjike.com"],
}
const topicIdParam = {
  type: "text",
  title: "主题 ID",
  default: "5aeaa84029e4000011ac3768",
} as const
const topicOrderParam = {
  type: "select",
  title: "排序",
  values: [
    { label: "最新", value: "recent" },
    { label: "热门", value: "hottest" },
  ],
  default: "recent",
} as const
const topicRadarPatch = {
  params: {
    topicId: "{{ scope.path.topicId }}",
  },
  metadata: {
    title: {
      select: "[class*=\"_textGroup_\"] > [class*=\"_title_\"]",
    },
  },
}

export default {
  title: "即刻",
  category: "social",
  icon: "https://web.okjike.com/favicon-32x32.png",
  color: "amber",
  defaults: {
    baseUrl: `${JIKE_WEB_ORIGIN}/`,
    capabilities: jikeCapabilities,
    cache: "5m",
    loader: {
      type: "custom",
    },
    metadata: {
      home: "/",
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
        title: "关注动态",
        desc: "已关注即刻用户发布的动态",
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
        title: "用户动态",
        desc: "指定即刻用户发布的动态",
      },
      radar: [
        {
          id: "jike-user-profile",
          match: {
            hosts: ["web.okjike.com"],
            paths: ["/u/:username", "/u/:username/*rest"],
          },
          patch: {
            params: {
              username: "{{ scope.path.username }}",
            },
            metadata: {
              desc: {
                select: "section[class^=\"_bio_\"]",
                template: "{{ scope.value | normalize_whitespace }}",
              },
              title: {
                select: "[class*=\"_nameRow_\"] a[aria-current=\"page\"]",
              },
            },
          },
          confidence: 0.9,
        },
      ],
      params: {
        username: {
          type: "text",
          title: "用户名",
          default: "7f422d5d-d79a-4f45-9880-b89d64d7f37a",
        },
      },
      loader: {
        load: fetchJikeUserUpdates,
      },
      cache: {
        version: 3,
        maxAge: "5m",
      },
    },
    "topic": {
      metadata: {
        title: "主题动态",
        desc: "指定即刻主题的动态",
      },
      radar: [
        {
          id: "jike-topic-square",
          match: {
            hosts: ["web.okjike.com"],
            paths: ["/topic/:topicId/square"],
          },
          patch: {
            ...topicRadarPatch,
            params: {
              ...topicRadarPatch.params,
              order: "recent",
            },
          },
          confidence: 0.9,
        },
        {
          id: "jike-topic-selected",
          match: {
            hosts: ["web.okjike.com"],
            paths: ["/topic/:topicId/selected"],
          },
          patch: {
            ...topicRadarPatch,
            params: {
              ...topicRadarPatch.params,
              order: "hottest",
            },
            metadata: {
              ...topicRadarPatch.metadata,
            },
          },
          confidence: 0.85,
        },
      ],
      params: {
        topicId: topicIdParam,
        order: topicOrderParam,
      },
      loader: {
        load: fetchJikeTopicFeed,
      },
    },
  },
} satisfies ProviderConfig
