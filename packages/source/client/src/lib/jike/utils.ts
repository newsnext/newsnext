import type { NewsItem } from "@newsnext/source-shared/typings"

import type {
  JikeFeedResponse,
  JikePicture,
  JikePost,
  JikeUser,
  TopicFeedOrder,
} from "./types"

export const JIKE_WEB_ORIGIN = "https://web.okjike.com"
export const JIKE_SHARE_ORIGIN = "https://m.okjike.com"
export const TOPIC_FEED_BASE_URL = "https://api.ruguoapp.com/1.0/topics/tabs"

const TOPIC_FEED_TAB_BY_ORDER: Record<TopicFeedOrder, string> = {
  recent: "square",
  hottest: "selected",
}

function compactText(text: string): string {
  return text.trim().replace(/\s+/g, " ")
}

export function getNumberProperty(value: unknown, key: string): number | undefined {
  if (!value || typeof value !== "object") {
    return undefined
  }

  const result = (value as Record<string, unknown>)[key]
  return typeof result === "number" ? result : undefined
}

export function isJikeAuthError(response: JikeFeedResponse): boolean {
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

export function getFetchErrorStatus(error: unknown): number | undefined {
  return getNumberProperty(error, "statusCode")
    ?? getNumberProperty(error, "status")
    ?? getNumberProperty((error as { response?: unknown } | null)?.response, "status")
    ?? getNumberProperty((error as { response?: unknown } | null)?.response, "statusCode")
}

export function isJikeAuthFetchError(error: unknown): boolean {
  const status = getFetchErrorStatus(error)
  return status === 401 || status === 403
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

export function isPinnedPersonalUpdate(post: JikePost): boolean {
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

export function createJikeHeaders(accessToken: string): Record<string, string> {
  return {
    "accept": "application/json, text/plain, */*",
    "content-type": "application/json",
    "platform": "web",
    "x-jike-access-token": accessToken,
  }
}

export function buildJikeTopicFeedUrl(order: TopicFeedOrder): string {
  return `${TOPIC_FEED_BASE_URL}/${TOPIC_FEED_TAB_BY_ORDER[order]}/feed`
}
