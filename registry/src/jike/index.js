import { isJwtExpired } from "@newsnext/source-kit/utils"
import { buildJikeTopicFeedUrl, createJikeHeaders, formatJikeAnnotation, formatJikeAuthorAnnotation, getJikeUserAvatar, isPinnedPersonalUpdate, JIKE_WEB_ORIGIN, jikePostsToNewsItems } from "./utils"

export { jikePostsToNewsItems } from "./utils"
const REFRESH_AUTH_TOKEN_URL = "https://api.ruguoapp.com/app_auth_tokens.refresh"
const FOLLOWING_UPDATES_URL = "https://api.ruguoapp.com/1.0/personalUpdate/followingUpdates"
const USER_UPDATES_URL = "https://api.ruguoapp.com/1.0/personalUpdate/single"
const SEARCH_URL = "https://api.ruguoapp.com/1.0/search/userPosts"
const FOLLOWING_UPDATES_LIMIT = 50
const SEARCH_RESULT_LIMIT = 50
const SEARCH_MAX_PAGES = 2
const JIKE_SEARCH_SORT_LABELS = {
  newest: "最新",
  hot: "最热",
}
const JIKE_ACCESS_TOKEN_SECRET_KEY = "accessToken"
const JIKE_REFRESH_TOKEN_SECRET_KEY = "refreshToken"
const JIKE_USER_ANNOTATION_TEMPLATE = "#{{ scope.item.attributes.topic }}"
const JIKE_ACCESS_TOKEN_EXPIRY_BUFFER_SECONDS = 30
async function refreshJikeAccessToken(refreshToken, context) {
  if (!refreshToken)
    return undefined
  try {
    const response = await context.fetch.post(REFRESH_AUTH_TOKEN_URL, {
      headers: {
        "platform": "web",
        "x-jike-refresh-token": refreshToken,
      },
      json: {},
    })
    const accessToken = response.headers.get("x-jike-access-token")?.trim()
    if (!accessToken)
      return undefined
    await context.updateSecrets?.({
      [JIKE_ACCESS_TOKEN_SECRET_KEY]: accessToken,
    })
    return accessToken
  } catch {
    context.signal.throwIfAborted()
    return undefined
  }
}
async function fetchJikeWithAuth(url, payload, context) {
  const refreshToken = context.secrets?.[JIKE_REFRESH_TOKEN_SECRET_KEY]?.trim()
  if (!refreshToken)
    throw new Error("Jike refreshToken secret is required.")
  const storedAccessToken = context.secrets?.[JIKE_ACCESS_TOKEN_SECRET_KEY]?.trim()
  let accessToken = !storedAccessToken
    || isJwtExpired(storedAccessToken, { bufferSeconds: JIKE_ACCESS_TOKEN_EXPIRY_BUFFER_SECONDS })
    ? await refreshJikeAccessToken(refreshToken, context) ?? storedAccessToken
    : storedAccessToken
  if (!accessToken)
    throw new Error("Jike accessToken refresh failed.")
  const jikeFetch = context.fetch.extend({
    hooks: {
      afterResponse: [async ({ request, response, retryCount }) => {
        // WHY: guard on retryCount and return context.fetch.retry(); recursing the loader would bypass the shared retry budget.
        if (![401, 403].includes(response.status) || retryCount > 0)
          return
        const refreshedAccessToken = await refreshJikeAccessToken(refreshToken, context)
        if (!refreshedAccessToken)
          return
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
    json: payload,
  }).json()
}
function assertSuccessfulFeed(response, fallback) {
  if (response.success === false) {
    throw new Error(response.error?.message ?? response.toast ?? fallback)
  }
}
export async function fetchJikeFollowingUpdates(_params, context) {
  const response = await fetchJikeWithAuth(FOLLOWING_UPDATES_URL, { limit: FOLLOWING_UPDATES_LIMIT }, context)
  assertSuccessfulFeed(response, "Failed to load Jike following updates.")
  return { items: jikePostsToNewsItems(response.data ?? []) }
}
export async function fetchJikeUserUpdates({ username }, context) {
  const response = await fetchJikeWithAuth(USER_UPDATES_URL, { limit: FOLLOWING_UPDATES_LIMIT, username }, context)
  assertSuccessfulFeed(response, "Failed to load Jike user updates.")
  const posts = (response.data ?? []).filter(post => !isPinnedPersonalUpdate(post))
  const badge = getJikeUserAvatar(posts.find(post => post.user)?.user)
  return {
    items: jikePostsToNewsItems(posts, { includeIcon: false }),
    metadata: badge ? { badge } : undefined,
  }
}
async function fetchJikeTopicFeed({ topicId, order }, context) {
  const response = await fetchJikeWithAuth(buildJikeTopicFeedUrl(order), { limit: FOLLOWING_UPDATES_LIMIT, topicId }, context)
  assertSuccessfulFeed(response, "Failed to load Jike topic feed.")
  return {
    items: jikePostsToNewsItems(response.data ?? []),
    metadata: order === "hottest" ? { type: "ranking" } : undefined,
  }
}
export async function fetchJikeSearch({ keyword, sortBy }, context) {
  const posts = []
  let loadMoreKey
  for (let page = 0; page < SEARCH_MAX_PAGES && posts.length < SEARCH_RESULT_LIMIT; page += 1) {
    const response = await fetchJikeWithAuth(SEARCH_URL, {
      keywords: keyword,
      loadMoreKey,
      scope: 0,
      sortBy,
    }, context)
    assertSuccessfulFeed(response, "Failed to search Jike updates.")
    const pagePosts = (response.data ?? []).filter(post => post.type === "ORIGINAL_POST")
    posts.push(...pagePosts)
    loadMoreKey = response.loadMoreKey
    if (pagePosts.length === 0 || loadMoreKey == null)
      break
  }
  return {
    items: jikePostsToNewsItems(posts.slice(0, SEARCH_RESULT_LIMIT)),
    metadata: {
      title: `${keyword} | ${JIKE_SEARCH_SORT_LABELS[sortBy]}`,
      home: `${JIKE_WEB_ORIGIN}/search?q=${encodeURIComponent(keyword)}`,
      type: sortBy === "hot" ? "ranking" : undefined,
    },
  }
}
const jikeCapabilities = {
  network: ["api.ruguoapp.com"],
  cookies: ["api.ruguoapp.com", "web.okjike.com"],
}
const topicIdParam = {
  type: "text",
  title: "主题 ID",
  default: "5aeaa84029e4000011ac3768",
  required: true,
}
const topicOrderParam = {
  type: "select",
  title: "排序",
  values: [
    { label: "最新", value: "recent" },
    { label: "热门", value: "hottest" },
  ],
  default: "recent",
}
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
function createJikeSearchRadar(id, sortBy) {
  return {
    id,
    match: {
      hosts: ["web.okjike.com"],
      paths: ["/search"],
      query: ["q"],
    },
    patch: {
      params: {
        keyword: "{{ scope.query.q }}",
        sortBy,
      },
      metadata: {
        title: `{{ scope.params.keyword }} | ${JIKE_SEARCH_SORT_LABELS[sortBy]}`,
        home: "https://web.okjike.com/search?q={{ scope.params.keyword | url_query }}",
      },
    },
  }
}
/** @type {import("@newsnext/source-kit/registry").ProviderConfig} */
export default {
  title: "即刻",
  category: "social",
  icon: "https://web.okjike.com/favicon-32x32.png",
  color: "amber",
  defaults: {
    baseUrl: `${JIKE_WEB_ORIGIN}/`,
    capabilities: jikeCapabilities,
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
      version: 3,
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
        },
      ],
      loader: {
        load: fetchJikeFollowingUpdates,
        annotation: formatJikeAnnotation,
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
                transform: "normalize_whitespace",
              },
              title: {
                select: "[class*=\"_nameRow_\"] a[aria-current=\"page\"]",
              },
            },
          },
        },
      ],
      params: {
        username: {
          type: "text",
          title: "用户名",
          default: "7f422d5d-d79a-4f45-9880-b89d64d7f37a",
          required: true,
        },
      },
      loader: {
        load: fetchJikeUserUpdates,
        annotation: JIKE_USER_ANNOTATION_TEMPLATE,
      },
      version: 5,
    },
    "search": {
      version: 5,
      metadata: {
        title: "动态搜索",
        desc: "按最新或最热排序显示匹配关键词的即刻动态",
      },
      radar: [
        createJikeSearchRadar("jike-search-newest", "newest"),
        createJikeSearchRadar("jike-search-hot", "hot"),
      ],
      params: {
        keyword: {
          type: "text",
          title: "关键词",
          default: "AI",
          required: true,
        },
        sortBy: {
          type: "select",
          title: "排序",
          values: [
            { label: "最新", value: "newest" },
            { label: "最热", value: "hot" },
          ],
          default: "newest",
        },
      },
      loader: {
        load: fetchJikeSearch,
        annotation: formatJikeAnnotation,
      },
    },
    "topic": {
      version: 5,
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
        },
      ],
      params: {
        topicId: topicIdParam,
        order: topicOrderParam,
      },
      loader: {
        load: fetchJikeTopicFeed,
        annotation: formatJikeAuthorAnnotation,
      },
    },
  },
}
