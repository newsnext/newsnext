export type TopicFeedOrder = "recent" | "hottest"

export interface JikeTopicFeedParams {
  topicId: string
}

export interface JikeUserUpdatesParams {
  username: string
}

export interface JikePicture {
  middlePicUrl?: string
  picUrl?: string
  smallPicUrl?: string
  thumbnailUrl?: string
}

export interface JikeUser {
  avatarImage?: JikePicture
  profileImageUrl?: string
  screenName?: string
  username?: string
}

export interface JikeTopic {
  content?: string
}

export interface JikeLinkInfo {
  linkUrl?: string
  pictureUrl?: string
  source?: string
  title?: string
}

export interface JikePost {
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

export interface JikeFeedResponse {
  success?: boolean
  data?: JikePost[]
  error?: {
    message?: string
  }
  toast?: string
}

export interface JikeRefreshTokenResponse {
  "x-jike-access-token"?: string
  "x-jike-refresh-token"?: string
}

export interface JikeAuthTokens {
  accessToken?: string
  refreshToken?: string
  deviceId?: string
}

export interface JikeStoredVars {
  JK_ACCESS_TOKEN?: string
  JK_REFRESH_TOKEN?: string
  JK_DEVICE_ID?: string
}

export interface NewsNextVars {
  jike?: JikeStoredVars
  [providerId: string]: unknown
}

export interface JikeRequestOptions {
  body: Record<string, unknown>
}

export interface BrowserTab {
  id?: number
}

export interface BrowserTabsApi {
  query: (
    queryInfo: { url: string | string[] },
    callback?: (tabs: BrowserTab[]) => void,
  ) => Promise<BrowserTab[]> | void
}

export interface BrowserScriptingApi {
  executeScript: (
    injection: {
      target: { tabId: number }
      args?: unknown[]
      func: (...args: unknown[]) => unknown
    },
    callback?: (results: Array<{ result?: unknown }>) => void,
  ) => Promise<Array<{ result?: unknown }>> | void
}

export interface BrowserStorageAreaApi {
  get: (
    keys: string | string[] | Record<string, unknown> | null,
    callback?: (items: Record<string, unknown>) => void,
  ) => Promise<Record<string, unknown>> | void
  set: (
    items: Record<string, unknown>,
    callback?: () => void,
  ) => Promise<void> | void
}

export interface BrowserExtensionGlobal {
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

export interface LocalStorageGlobal {
  localStorage?: {
    getItem: (key: string) => string | null
    setItem: (key: string, value: string) => void
  }
}
