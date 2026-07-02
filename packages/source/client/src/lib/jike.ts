import type { NewsItem } from "@newsnext/source-shared/typings"
import { myFetch } from "@newsnext/source-shared/utils/fetch"
import { $textParam } from "@newsnext/source-shared/utils/params"
import { $provider, $source } from "@newsnext/source-shared/utils/source"

const JIKE_WEB_ORIGIN = "https://web.okjike.com"
const JIKE_SHARE_ORIGIN = "https://m.okjike.com"
const FOLLOWING_UPDATES_URL = "https://api.ruguoapp.com/1.0/personalUpdate/followingUpdates"
const USER_UPDATES_URL = "https://api.ruguoapp.com/1.0/personalUpdate/single"
const TOPIC_FEED_BASE_URL = "https://api.ruguoapp.com/1.0/topics/tabs"
const FOLLOWING_UPDATES_LIMIT = 50
const JIKE_ACCESS_TOKEN_STORAGE_KEY = "JK_ACCESS_TOKEN"

type TopicFeedOrder = "recent" | "hottest"

const TOPIC_FEED_TAB_BY_ORDER: Record<TopicFeedOrder, string> = {
  recent: "square",
  hottest: "selected",
}

interface JikeTopicFeedParams {
  topicId: string
}

interface JikeUserUpdatesParams {
  username: string
}

interface JikePicture {
  middlePicUrl?: string
  picUrl?: string
  smallPicUrl?: string
  thumbnailUrl?: string
}

interface JikeUser {
  avatarImage?: JikePicture
  profileImageUrl?: string
  screenName?: string
}

interface JikeTopic {
  content?: string
}

interface JikeLinkInfo {
  linkUrl?: string
  pictureUrl?: string
  source?: string
  title?: string
}

interface JikePost {
  id?: string
  type?: string
  content?: string
  createdAt?: string
  actionTime?: string
  commentCount?: number
  likeCount?: number
  pictures?: JikePicture[]
  target?: JikePost
  topic?: JikeTopic
  user?: JikeUser
  linkInfo?: JikeLinkInfo
  pinned?: {
    personalUpdate?: boolean
  }
}

interface JikeFeedResponse {
  success?: boolean
  data?: JikePost[]
  error?: {
    message?: string
  }
  toast?: string
}

interface BrowserTab {
  id?: number
}

interface BrowserTabsApi {
  query: (
    queryInfo: { url: string | string[] },
    callback?: (tabs: BrowserTab[]) => void,
  ) => Promise<BrowserTab[]> | void
}

interface BrowserScriptingApi {
  executeScript: (
    injection: {
      target: { tabId: number }
      args: [string]
      func: (key: string) => string | null
    },
    callback?: (results: Array<{ result?: string | null }>) => void,
  ) => Promise<Array<{ result?: string | null }>> | void
}

interface BrowserExtensionGlobal {
  chrome?: {
    runtime?: {
      lastError?: { message?: string }
    }
    scripting?: BrowserScriptingApi
    tabs?: BrowserTabsApi
  }
  browser?: {
    scripting?: BrowserScriptingApi
    tabs?: BrowserTabsApi
  }
}

interface LocalStorageGlobal {
  localStorage?: {
    getItem: (key: string) => string | null
  }
}

function isPromiseLike<T>(value: unknown): value is Promise<T> {
  return typeof value === "object"
    && value !== null
    && "then" in value
    && typeof value.then === "function"
}

function compactText(text: string): string {
  return text.trim().replace(/\s+/g, " ")
}

function getExtensionTabsApi(): BrowserTabsApi | undefined {
  const extensionGlobal = globalThis as BrowserExtensionGlobal
  return extensionGlobal.browser?.tabs ?? extensionGlobal.chrome?.tabs
}

function getExtensionScriptingApi(): BrowserScriptingApi | undefined {
  const extensionGlobal = globalThis as BrowserExtensionGlobal
  return extensionGlobal.browser?.scripting ?? extensionGlobal.chrome?.scripting
}

function readLocalStorageValue(key: string): string | null {
  return (globalThis as LocalStorageGlobal).localStorage?.getItem(key) ?? null
}

async function queryJikeTabs(tabs: BrowserTabsApi): Promise<BrowserTab[]> {
  const query = { url: `${JIKE_WEB_ORIGIN}/*` }
  const maybeTabs = tabs.query(query)
  if (isPromiseLike<BrowserTab[]>(maybeTabs)) {
    return await maybeTabs
  }

  return await new Promise((resolve) => {
    tabs.query(query, resolve)
  })
}

async function executeReadJikeAccessToken(
  scripting: BrowserScriptingApi,
  tabId: number,
): Promise<string | undefined> {
  const injection = {
    target: { tabId },
    args: [JIKE_ACCESS_TOKEN_STORAGE_KEY],
    func: readLocalStorageValue,
  } satisfies Parameters<BrowserScriptingApi["executeScript"]>[0]
  const maybeResults = scripting.executeScript(injection)
  const results = isPromiseLike<Array<{ result?: string | null }>>(maybeResults)
    ? await maybeResults
    : await new Promise<Array<{ result?: string | null }>>((resolve) => {
        scripting.executeScript(injection, resolve)
      })

  return results[0]?.result?.trim() || undefined
}

async function getJikeAccessToken(): Promise<string> {
  const tabs = getExtensionTabsApi()
  const scripting = getExtensionScriptingApi()
  if (!tabs || !scripting) {
    throw new Error("Jike requires browser tabs and scripting permissions to read web.okjike.com localStorage.")
  }

  const [tab] = (await queryJikeTabs(tabs)).filter((item): item is BrowserTab & { id: number } => typeof item.id === "number")
  if (!tab) {
    throw new Error("Open https://web.okjike.com/ in a browser tab first so NewsNext can read JK_ACCESS_TOKEN.")
  }

  const accessToken = await executeReadJikeAccessToken(scripting, tab.id)
  const extensionGlobal = globalThis as BrowserExtensionGlobal
  const runtimeError = extensionGlobal.chrome?.runtime?.lastError?.message
  if (runtimeError) {
    throw new Error(runtimeError)
  }

  if (!accessToken) {
    throw new Error("JK_ACCESS_TOKEN was not found in https://web.okjike.com/ localStorage.")
  }

  return accessToken
}

function parseTimestamp(post: JikePost): number | undefined {
  const timestampSource = post.actionTime ?? post.createdAt
  if (!timestampSource) {
    return undefined
  }

  const timestamp = new Date(timestampSource).getTime()
  return Number.isNaN(timestamp) ? undefined : timestamp
}

function getPostUrl(post: JikePost): string | undefined {
  const id = post.id
  if (!id) {
    return undefined
  }

  if (post.type === "REPOST") {
    return `${JIKE_SHARE_ORIGIN}/reposts/${id}`
  }

  if (post.type === "ORIGINAL_POST") {
    return `${JIKE_SHARE_ORIGIN}/originalPosts/${id}`
  }

  return undefined
}

function getPictureUrl(picture: JikePicture): string | undefined {
  return picture.middlePicUrl ?? picture.picUrl ?? picture.smallPicUrl ?? picture.thumbnailUrl
}

function getUserAvatar(user: JikeUser | undefined): string | undefined {
  return user?.profileImageUrl ?? getPictureUrl(user?.avatarImage ?? {})
}

function getPostTitle(post: JikePost): string {
  const ownContent = post.content ? compactText(post.content) : ""
  if (ownContent) {
    return ownContent
  }

  const targetContent = post.target?.content ? compactText(post.target.content) : ""
  if (targetContent) {
    return targetContent
  }

  return post.linkInfo?.title ?? "Jike update"
}

function getInlineText(post: JikePost): string {
  const parts = [
    post.user?.screenName,
    post.topic?.content ? `#${post.topic.content}` : undefined,
    typeof post.likeCount === "number" ? `${post.likeCount} likes` : undefined,
    typeof post.commentCount === "number" ? `${post.commentCount} comments` : undefined,
  ]

  return parts.filter(Boolean).join(" · ")
}

function getPreviewText(post: JikePost): string | undefined {
  const target = post.target
  if (target?.content) {
    const author = target.user?.screenName
    const content = compactText(target.content)
    return author ? `${author}: ${content}` : content
  }

  return post.linkInfo?.title
}

function getPreviewPictures(post: JikePost): string[] {
  const pictures = post.pictures?.length ? post.pictures : post.target?.pictures
  return (pictures ?? []).map(getPictureUrl).filter((url): url is string => Boolean(url))
}

function isPinnedPersonalUpdate(post: JikePost): boolean {
  return post.pinned?.personalUpdate === true
}

export function jikePostsToNewsItems(posts: JikePost[]): NewsItem[] {
  return posts
    .map((post): NewsItem | null => {
      const url = getPostUrl(post)
      if (!url) {
        return null
      }

      const item: NewsItem = {
        title: getPostTitle(post),
        url,
        timestamp: parseTimestamp(post),
      }

      const inlineText = getInlineText(post)
      const avatar = getUserAvatar(post.user)
      if (inlineText || avatar) {
        item.inline = {
          text: inlineText,
          ...(avatar ? { icon: { src: avatar, radius: 4 } } : {}),
        }
      }

      const previewText = getPreviewText(post)
      const pictures = getPreviewPictures(post)
      if (previewText || pictures.length > 0 || post.linkInfo?.pictureUrl) {
        item.preview = {
          text: previewText ?? "",
          picture: pictures.length > 0 ? pictures : post.linkInfo?.pictureUrl,
        }
      }

      return item
    })
    .filter((item): item is NewsItem => item !== null)
}

function createJikeHeaders(accessToken: string): Record<string, string> {
  return {
    "accept": "application/json, text/plain, */*",
    "content-type": "application/json",
    "platform": "web",
    "x-jike-access-token": accessToken,
  }
}

function buildJikeTopicFeedUrl(order: TopicFeedOrder): string {
  return `${TOPIC_FEED_BASE_URL}/${TOPIC_FEED_TAB_BY_ORDER[order]}/feed`
}

export async function fetchJikeFollowingUpdates(): Promise<NewsItem[]> {
  const accessToken = await getJikeAccessToken()

  const response = await myFetch<JikeFeedResponse>(FOLLOWING_UPDATES_URL, {
    method: "POST",
    credentials: "include",
    headers: createJikeHeaders(accessToken),
    body: {
      limit: FOLLOWING_UPDATES_LIMIT,
    },
  })

  if (response.success === false) {
    throw new Error(response.error?.message ?? response.toast ?? "Failed to load Jike following updates.")
  }

  return jikePostsToNewsItems(response.data ?? [])
}

export async function fetchJikeUserUpdates({
  username,
}: JikeUserUpdatesParams): Promise<NewsItem[]> {
  const accessToken = await getJikeAccessToken()

  const response = await myFetch<JikeFeedResponse>(USER_UPDATES_URL, {
    method: "POST",
    credentials: "include",
    headers: createJikeHeaders(accessToken),
    body: {
      limit: FOLLOWING_UPDATES_LIMIT,
      username: username.trim(),
    },
  })

  if (response.success === false) {
    throw new Error(response.error?.message ?? response.toast ?? "Failed to load Jike user updates.")
  }

  return jikePostsToNewsItems((response.data ?? []).filter(post => !isPinnedPersonalUpdate(post)))
}

async function fetchJikeTopicFeedByOrder({
  topicId,
  order,
}: JikeTopicFeedParams & { order: TopicFeedOrder }): Promise<NewsItem[]> {
  const accessToken = await getJikeAccessToken()

  const response = await myFetch<JikeFeedResponse>(buildJikeTopicFeedUrl(order), {
    method: "POST",
    credentials: "include",
    headers: createJikeHeaders(accessToken),
    body: {
      limit: FOLLOWING_UPDATES_LIMIT,
      topicId: topicId.trim(),
    },
  })

  if (response.success === false) {
    throw new Error(response.error?.message ?? response.toast ?? "Failed to load Jike topic feed.")
  }

  return jikePostsToNewsItems(response.data ?? [])
}

export async function fetchJikeTopicRecentFeed(params: JikeTopicFeedParams): Promise<NewsItem[]> {
  return fetchJikeTopicFeedByOrder({ ...params, order: "recent" })
}

export async function fetchJikeTopicHottestFeed(params: JikeTopicFeedParams): Promise<NewsItem[]> {
  return fetchJikeTopicFeedByOrder({ ...params, order: "hottest" })
}

export default $provider({
  title: "Jike",
  home: JIKE_WEB_ORIGIN,
  color: "yellow",
  icon: `${JIKE_WEB_ORIGIN}/favicon.ico`,
  sources: [
    $source(
      {
        key: "following-updates",
        title: "Following updates",
        desc: "Updates from followed Jike users",
        type: "timeline",
        category: "others",
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
        params: {
          username: $textParam({
            title: "Username",
            default: "a2d6acc1-626f-4d15-a22a-849e88a4c9f0",
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
