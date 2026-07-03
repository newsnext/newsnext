import type { NewsItem } from "@newsnext/source-shared/typings"
import type {
  BrowserExtensionGlobal,
  BrowserScriptingApi,
  BrowserTab,
  BrowserTabsApi,
  JikeAuthTokens,
  JikeFeedResponse,
  JikeRefreshTokenResponse,
  JikeRequestOptions,
  JikeStoredVars,
  JikeTopicFeedParams,
  JikeUserUpdatesParams,
  NewsNextVars,
  TopicFeedOrder,
} from "./types"
import { myFetch } from "@newsnext/source-shared/utils/fetch"
import { $textParam } from "@newsnext/source-shared/utils/params"

import { $provider, $source } from "@newsnext/source-shared/utils/source"

import {
  buildJikeTopicFeedUrl,
  createJikeHeaders,
  getExtensionScriptingApi,
  getExtensionStorageArea,
  getExtensionTabsApi,
  getStringProperty,
  isBrowserScriptingApi,
  isBrowserStorageAreaApi,
  isBrowserTabsApi,
  isJikeAuthError,
  isJikeAuthFetchError,
  isPinnedPersonalUpdate,
  isPromiseLike,
  JIKE_WEB_ORIGIN,
  jikePostsToNewsItems,
  parseNewsNextVars,
  readLocalStorageValue,
} from "./utils"

export { jikePostsToNewsItems } from "./utils"

const REFRESH_AUTH_TOKEN_URL = "https://api.ruguoapp.com/app_auth_tokens.refresh"
const FOLLOWING_UPDATES_URL = "https://api.ruguoapp.com/1.0/personalUpdate/followingUpdates"
const USER_UPDATES_URL = "https://api.ruguoapp.com/1.0/personalUpdate/single"
const FOLLOWING_UPDATES_LIMIT = 50
const NEWSNEXT_VARS_STORAGE_KEY = "newsnext_vars"
const JIKE_PROVIDER_ID = "jike"
const JIKE_ACCESS_TOKEN_STORAGE_KEY = "JK_ACCESS_TOKEN"
const JIKE_REFRESH_TOKEN_STORAGE_KEY = "JK_REFRESH_TOKEN"
const JIKE_DEVICE_ID_STORAGE_KEY = "JK_DEVICE_ID"

async function readExtensionStorageValue(key: string): Promise<string | undefined> {
  const extensionStorage = getExtensionStorageArea()
  if (!extensionStorage) {
    throw new Error("Jike requires browser storage permission to read newsnext_vars.")
  }

  if (isBrowserStorageAreaApi(extensionStorage)) {
    const maybeItems = extensionStorage.get(key)
    if (isPromiseLike<Record<string, unknown>>(maybeItems)) {
      const items = await maybeItems
      const value = items[key]
      return typeof value === "string" ? value : undefined
    }
  }

  return await new Promise((resolve) => {
    extensionStorage.get(key, (items) => {
      const value = items[key]
      resolve(typeof value === "string" ? value : undefined)
    })
  })
}

async function writeExtensionStorageValue(key: string, value: string): Promise<void> {
  const extensionStorage = getExtensionStorageArea()
  if (!extensionStorage) {
    throw new Error("Jike requires browser storage permission to write newsnext_vars.")
  }

  if (isBrowserStorageAreaApi(extensionStorage)) {
    const maybeResult = extensionStorage.set({ [key]: value })
    if (isPromiseLike<void>(maybeResult)) {
      await maybeResult
      return
    }
  }

  await new Promise<void>((resolve) => {
    extensionStorage.set({ [key]: value }, resolve)
  })
}

async function readNewsNextVars(): Promise<NewsNextVars> {
  const extensionValue = await readExtensionStorageValue(NEWSNEXT_VARS_STORAGE_KEY)
  return parseNewsNextVars(extensionValue ?? null)
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
