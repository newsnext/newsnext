import type { NewsItem } from "@newsnext/source-shared/typings"
import { myFetch } from "@newsnext/source-shared/utils/fetch"
import { $textParam } from "@newsnext/source-shared/utils/params"
import { $provider, $source } from "@newsnext/source-shared/utils/source"

const JIKE_WEB_ORIGIN = "https://web.okjike.com"
const JIKE_SHARE_ORIGIN = "https://m.okjike.com"
const REFRESH_AUTH_TOKEN_URL = "https://api.ruguoapp.com/app_auth_tokens.refresh"
const FOLLOWING_UPDATES_URL = "https://api.ruguoapp.com/1.0/personalUpdate/followingUpdates"
const USER_UPDATES_URL = "https://api.ruguoapp.com/1.0/personalUpdate/single"
const TOPIC_FEED_BASE_URL = "https://api.ruguoapp.com/1.0/topics/tabs"
const FOLLOWING_UPDATES_LIMIT = 50
const NEWSNEXT_VARS_STORAGE_KEY = "newsnext_vars"
const JIKE_PROVIDER_ID = "jike"
const JIKE_ACCESS_TOKEN_STORAGE_KEY = "JK_ACCESS_TOKEN"
const JIKE_REFRESH_TOKEN_STORAGE_KEY = "JK_REFRESH_TOKEN"
const JIKE_DEVICE_ID_STORAGE_KEY = "JK_DEVICE_ID"

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
  username?: string
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

interface JikeRefreshTokenResponse {
  "x-jike-access-token"?: string
  "x-jike-refresh-token"?: string
}

interface JikeAuthTokens {
  accessToken?: string
  refreshToken?: string
  deviceId?: string
}

interface JikeStoredVars {
  JK_ACCESS_TOKEN?: string
  JK_REFRESH_TOKEN?: string
  JK_DEVICE_ID?: string
}

interface NewsNextVars {
  jike?: JikeStoredVars
  [providerId: string]: unknown
}

interface JikeRequestOptions {
  body: Record<string, unknown>
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
      args?: unknown[]
      func: (...args: unknown[]) => unknown
    },
    callback?: (results: Array<{ result?: unknown }>) => void,
  ) => Promise<Array<{ result?: unknown }>> | void
}

interface BrowserStorageAreaApi {
  get: (
    keys: string | string[] | Record<string, unknown> | null,
    callback?: (items: Record<string, unknown>) => void,
  ) => Promise<Record<string, unknown>> | void
  set: (
    items: Record<string, unknown>,
    callback?: () => void,
  ) => Promise<void> | void
}

interface BrowserExtensionGlobal {
  chrome?: {
    runtime?: {
      lastError?: { message?: string }
    }
    scripting?: BrowserScriptingApi
    storage?: {
      local?: BrowserStorageAreaApi
    }
    tabs?: BrowserTabsApi
  }
  browser?: {
    scripting?: BrowserScriptingApi
    storage?: {
      local?: BrowserStorageAreaApi
    }
    tabs?: BrowserTabsApi
  }
}

interface LocalStorageGlobal {
  localStorage?: {
    getItem: (key: string) => string | null
    setItem: (key: string, value: string) => void
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

function getExtensionStorageArea(): BrowserStorageAreaApi | undefined {
  const extensionGlobal = globalThis as BrowserExtensionGlobal
  return extensionGlobal.browser?.storage?.local ?? extensionGlobal.chrome?.storage?.local
}

function isBrowserTabsApi(tabs: BrowserTabsApi): boolean {
  return (globalThis as BrowserExtensionGlobal).browser?.tabs === tabs
}

function isBrowserScriptingApi(scripting: BrowserScriptingApi): boolean {
  return (globalThis as BrowserExtensionGlobal).browser?.scripting === scripting
}

function isBrowserStorageAreaApi(storage: BrowserStorageAreaApi): boolean {
  return (globalThis as BrowserExtensionGlobal).browser?.storage?.local === storage
}

function readLocalStorageValue(...args: unknown[]): string | null {
  const [key] = args
  if (typeof key !== "string") {
    return null
  }

  return (globalThis as LocalStorageGlobal).localStorage?.getItem(key) ?? null
}

function parseNewsNextVars(value: string | null): NewsNextVars {
  if (!value) {
    return {}
  }

  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as NewsNextVars : {}
  } catch {
    return {}
  }
}

async function readExtensionStorageValue(key: string): Promise<string | undefined> {
  const storage = getExtensionStorageArea()
  if (!storage) {
    throw new Error("Jike requires browser storage permission to read newsnext_vars.")
  }

  if (isBrowserStorageAreaApi(storage)) {
    const maybeItems = storage.get(key)
    if (isPromiseLike<Record<string, unknown>>(maybeItems)) {
      const items = await maybeItems
      const value = items[key]
      return typeof value === "string" ? value : undefined
    }
  }

  return await new Promise((resolve) => {
    storage.get(key, (items) => {
      const value = items[key]
      resolve(typeof value === "string" ? value : undefined)
    })
  })
}

async function writeExtensionStorageValue(key: string, value: string): Promise<void> {
  const storage = getExtensionStorageArea()
  if (!storage) {
    throw new Error("Jike requires browser storage permission to write newsnext_vars.")
  }

  if (isBrowserStorageAreaApi(storage)) {
    const maybeResult = storage.set({ [key]: value })
    if (isPromiseLike<void>(maybeResult)) {
      await maybeResult
      return
    }
  }

  await new Promise<void>((resolve) => {
    storage.set({ [key]: value }, resolve)
  })
}

async function readNewsNextVars(): Promise<NewsNextVars> {
  const extensionValue = await readExtensionStorageValue(NEWSNEXT_VARS_STORAGE_KEY)
  return parseNewsNextVars(extensionValue ?? null)
}

function getStringProperty(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined
  }

  const result = (value as Record<string, unknown>)[key]
  return typeof result === "string" ? result.trim() || undefined : undefined
}

function getNumberProperty(value: unknown, key: string): number | undefined {
  if (!value || typeof value !== "object") {
    return undefined
  }

  const result = (value as Record<string, unknown>)[key]
  return typeof result === "number" ? result : undefined
}

async function readStoredJikeAuthTokens(): Promise<JikeAuthTokens | undefined> {
  const jikeVars = (await readNewsNextVars())[JIKE_PROVIDER_ID]
  const accessToken = getStringProperty(jikeVars, JIKE_ACCESS_TOKEN_STORAGE_KEY)
  const refreshToken = getStringProperty(jikeVars, JIKE_REFRESH_TOKEN_STORAGE_KEY)
  const deviceId = getStringProperty(jikeVars, JIKE_DEVICE_ID_STORAGE_KEY)
  if (!accessToken || !refreshToken) {
    return undefined
  }

  return {
    accessToken,
    refreshToken,
    deviceId: deviceId || undefined,
  }
}

async function writeStoredJikeAuthTokens(tokens: JikeAuthTokens): Promise<void> {
  const vars = await readNewsNextVars()
  const currentJikeVars = vars[JIKE_PROVIDER_ID]
  const nextJikeVars: JikeStoredVars = currentJikeVars && typeof currentJikeVars === "object" && !Array.isArray(currentJikeVars)
    ? { ...(currentJikeVars as JikeStoredVars) }
    : {}

  if (tokens.accessToken) {
    nextJikeVars.JK_ACCESS_TOKEN = tokens.accessToken
  }
  if (tokens.refreshToken) {
    nextJikeVars.JK_REFRESH_TOKEN = tokens.refreshToken
  }
  if (tokens.deviceId) {
    nextJikeVars.JK_DEVICE_ID = tokens.deviceId
  }

  const serialized = JSON.stringify({
    ...vars,
    [JIKE_PROVIDER_ID]: nextJikeVars,
  })
  await writeExtensionStorageValue(NEWSNEXT_VARS_STORAGE_KEY, serialized)
}

async function queryJikeTabs(tabs: BrowserTabsApi): Promise<BrowserTab[]> {
  const query = { url: `${JIKE_WEB_ORIGIN}/*` }
  if (isBrowserTabsApi(tabs)) {
    const maybeTabs = tabs.query(query)
    if (isPromiseLike<BrowserTab[]>(maybeTabs)) {
      return await maybeTabs
    }
  }

  return await new Promise((resolve) => {
    tabs.query(query, resolve)
  })
}

async function executeReadJikeStorageValue(
  scripting: BrowserScriptingApi,
  tabId: number,
  key: string,
): Promise<string | undefined> {
  const injection = {
    target: { tabId },
    args: [key],
    func: readLocalStorageValue,
  } satisfies Parameters<BrowserScriptingApi["executeScript"]>[0]
  const results = await executeJikeScript(scripting, injection)

  const result = results[0]?.result
  return typeof result === "string" ? result.trim() || undefined : undefined
}

async function executeJikeScript(
  scripting: BrowserScriptingApi,
  injection: Parameters<BrowserScriptingApi["executeScript"]>[0],
): Promise<Array<{ result?: unknown }>> {
  if (isBrowserScriptingApi(scripting)) {
    const maybeResults = scripting.executeScript(injection)
    if (isPromiseLike<Array<{ result?: unknown }>>(maybeResults)) {
      return await maybeResults
    }
  }

  return await new Promise<Array<{ result?: unknown }>>((resolve) => {
    scripting.executeScript(injection, resolve)
  })
}

async function getJikeAuthTab(): Promise<{ scripting: BrowserScriptingApi, tabId: number }> {
  const tabs = getExtensionTabsApi()
  const scripting = getExtensionScriptingApi()
  if (!tabs || !scripting) {
    throw new Error("Jike requires browser tabs and scripting permissions to read web.okjike.com localStorage.")
  }

  const [tab] = (await queryJikeTabs(tabs)).filter((item): item is BrowserTab & { id: number } => typeof item.id === "number")
  if (!tab) {
    throw new Error("Open https://web.okjike.com/ in a browser tab first so NewsNext can read JK_REFRESH_TOKEN.")
  }

  return { scripting, tabId: tab.id }
}

async function loadJikeAuthTokensFromWeb(): Promise<JikeAuthTokens> {
  const { scripting, tabId } = await getJikeAuthTab()
  const accessToken = await executeReadJikeStorageValue(scripting, tabId, JIKE_ACCESS_TOKEN_STORAGE_KEY)
  const refreshToken = await executeReadJikeStorageValue(scripting, tabId, JIKE_REFRESH_TOKEN_STORAGE_KEY)
  const deviceId = await executeReadJikeStorageValue(scripting, tabId, JIKE_DEVICE_ID_STORAGE_KEY)
  const extensionGlobal = globalThis as BrowserExtensionGlobal
  const runtimeError = extensionGlobal.chrome?.runtime?.lastError?.message
  if (runtimeError) {
    throw new Error(runtimeError)
  }

  if (!refreshToken) {
    throw new Error("JK_REFRESH_TOKEN was not found in https://web.okjike.com/ localStorage.")
  }

  const tokens = {
    accessToken,
    refreshToken,
    deviceId,
  }
  await writeStoredJikeAuthTokens(tokens)
  return tokens
}

async function refreshJikeAccessToken(tokens: JikeAuthTokens): Promise<string> {
  if (!tokens.refreshToken) {
    throw new Error("JK_REFRESH_TOKEN was not found in localStorage.")
  }

  const refreshed = await myFetch<JikeRefreshTokenResponse>(REFRESH_AUTH_TOKEN_URL, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "platform": "web",
      "x-jike-refresh-token": tokens.refreshToken,
      ...(tokens.deviceId ? { "x-jike-device-id": tokens.deviceId } : {}),
    },
    body: {},
  })
  const accessToken = refreshed["x-jike-access-token"]?.trim()
  const refreshToken = refreshed["x-jike-refresh-token"]?.trim()
  if (!accessToken) {
    throw new Error("Failed to refresh Jike access token from JK_REFRESH_TOKEN.")
  }

  await writeStoredJikeAuthTokens({
    accessToken,
    refreshToken: refreshToken ?? tokens.refreshToken,
    deviceId: tokens.deviceId,
  })

  return accessToken
}

async function getJikeAuthTokens(): Promise<JikeAuthTokens> {
  return await readStoredJikeAuthTokens() ?? await loadJikeAuthTokensFromWeb()
}

function isJikeAuthError(response: JikeFeedResponse): boolean {
  if (response.success !== false) {
    return false
  }

  const message = `${response.error?.message ?? ""} ${response.toast ?? ""}`.toLowerCase()
  return [
    "token",
    "auth",
    "unauthorized",
    "login",
    "登录",
    "鉴权",
    "认证",
    "过期",
  ].some(keyword => message.includes(keyword))
}

function getFetchErrorStatus(error: unknown): number | undefined {
  return getNumberProperty(error, "statusCode")
    ?? getNumberProperty(error, "status")
    ?? getNumberProperty((error as { response?: unknown } | null)?.response, "status")
    ?? getNumberProperty((error as { response?: unknown } | null)?.response, "statusCode")
}

function isJikeAuthFetchError(error: unknown): boolean {
  const status = getFetchErrorStatus(error)
  return status === 401 || status === 403
}

async function requestJikeFeed(url: string, options: JikeRequestOptions, accessToken: string): Promise<JikeFeedResponse> {
  return await myFetch<JikeFeedResponse>(url, {
    method: "POST",
    credentials: "include",
    headers: createJikeHeaders(accessToken),
    body: options.body,
  })
}

async function retryJikeWithFreshAccessToken(
  url: string,
  options: JikeRequestOptions,
  fallbackTokens: JikeAuthTokens,
): Promise<JikeFeedResponse> {
  const refreshedAccessToken = await refreshJikeAccessToken(await readStoredJikeAuthTokens() ?? fallbackTokens)
  return await requestJikeFeed(url, options, refreshedAccessToken)
}

async function fetchJikeWithAuth(url: string, options: JikeRequestOptions): Promise<JikeFeedResponse> {
  const tokens = await getJikeAuthTokens()
  const accessToken = tokens.accessToken ?? await refreshJikeAccessToken(tokens)
  let response: JikeFeedResponse

  try {
    response = await requestJikeFeed(url, options, accessToken)
  } catch (error) {
    if (!isJikeAuthFetchError(error)) {
      throw error
    }

    return await retryJikeWithFreshAccessToken(url, options, tokens)
  }

  if (!isJikeAuthError(response)) {
    return response
  }

  return await retryJikeWithFreshAccessToken(url, options, tokens)
}

function parseTimestamp(post: JikePost): number | undefined {
  const timestampSource = post.actionTime ?? post.createdAt
  if (!timestampSource) {
    return undefined
  }

  const timestamp = new Date(timestampSource).getTime()
  return Number.isNaN(timestamp) ? undefined : timestamp
}

function getPostTypeSlug(post: JikePost): "post" | "repost" | undefined {
  if (post.type === "ORIGINAL_POST") {
    return "post"
  }

  if (post.type === "REPOST") {
    return "repost"
  }

  return undefined
}

function getPostMobileUrl(post: JikePost): string | undefined {
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

function getPostWebUrl(post: JikePost): string | undefined {
  const id = post.id
  const username = post.user?.username
  const type = getPostTypeSlug(post)
  if (!id || !username || !type) {
    return undefined
  }

  return `${JIKE_WEB_ORIGIN}/u/${username}/${type}/${id}`
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
      const mobileUrl = getPostMobileUrl(post)
      if (!mobileUrl) {
        return null
      }

      const item: NewsItem = {
        title: getPostTitle(post),
        url: getPostWebUrl(post) ?? mobileUrl,
        mobileUrl,
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
  const response = await fetchJikeWithAuth(FOLLOWING_UPDATES_URL, {
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
  const response = await fetchJikeWithAuth(USER_UPDATES_URL, {
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
  const response = await fetchJikeWithAuth(buildJikeTopicFeedUrl(order), {
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
