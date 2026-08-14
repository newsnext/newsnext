import type { NewsItemInput } from "@newsnext/source/types"
import type { JikePicture, JikePost, JikeUser, TopicFeedOrder } from "./types"

export const JIKE_WEB_ORIGIN = "https://web.okjike.com"
const JIKE_SHARE_ORIGIN = "https://m.okjike.com"
const TOPIC_FEED_BASE_URL = "https://api.ruguoapp.com/1.0/topics/tabs"

function compactText(text: string): string {
  return text.trim().replace(/\s+/g, " ")
}

function getPictureUrl(picture: JikePicture): string | undefined {
  return picture.middlePicUrl ?? picture.picUrl ?? picture.smallPicUrl ?? picture.thumbnailUrl
}

export function getJikeUserAvatar(user: JikeUser | undefined): string | undefined {
  return user?.profileImageUrl ?? getPictureUrl(user?.avatarImage ?? {})
}

function getPostMobileUrl(post: JikePost): string | undefined {
  if (!post.id) return undefined
  if (post.type === "REPOST") return `${JIKE_SHARE_ORIGIN}/reposts/${post.id}`
  if (post.type === "ORIGINAL_POST") return `${JIKE_SHARE_ORIGIN}/originalPosts/${post.id}`
  return undefined
}

function getPostWebUrl(post: JikePost): string | undefined {
  const type = post.type === "ORIGINAL_POST" ? "post" : post.type === "REPOST" ? "repost" : undefined
  if (!post.id || !post.user?.username || !type) return undefined
  return `${JIKE_WEB_ORIGIN}/u/${post.user.username}/${type}/${post.id}`
}

function getPostTitle(post: JikePost): string {
  const ownContent = post.content ? compactText(post.content) : ""
  const targetContent = post.target?.content ? compactText(post.target.content) : ""
  return ownContent || targetContent || post.linkInfo?.title || "Jike update"
}

export function isPinnedPersonalUpdate(post: JikePost): boolean {
  return post.pinned?.personalUpdate === true
}

export function jikePostsToNewsItems(
  posts: JikePost[],
  options: { includeIcon?: boolean } = {},
): NewsItemInput[] {
  const { includeIcon = true } = options
  return posts.flatMap((post): NewsItemInput[] => {
    const mobileUrl = getPostMobileUrl(post)
    if (!mobileUrl) return []

    const timestampSource = post.actionTime ?? post.createdAt
    const timestamp = timestampSource ? Date.parse(timestampSource) : Number.NaN
    const authorName = post.user?.screenName
    const avatar = includeIcon ? getJikeUserAvatar(post.user) : undefined
    const previewText = post.target?.content
      ? `${post.target.user?.screenName ? `${post.target.user.screenName}: ` : ""}${compactText(post.target.content)}`
      : post.linkInfo?.title
    const pictures = (post.pictures?.length ? post.pictures : post.target?.pictures)
      ?.map(getPictureUrl)
      .filter((url): url is string => Boolean(url))
    const item: NewsItemInput = {
      title: getPostTitle(post),
      url: getPostWebUrl(post) ?? mobileUrl,
      mobileUrl,
      publishedAt: timestamp,
      author: {
        name: authorName,
        home: post.user?.username ? `${JIKE_WEB_ORIGIN}/u/${post.user.username}` : undefined,
      },
      stats: {
        likes: post.likeCount,
        comments: post.commentCount,
      },
      attributes: { topic: post.topic?.content },
      icon: {
        kind: "author",
        label: authorName,
        src: avatar,
      },
      content: {
        text: previewText,
        pictures: pictures?.length ? pictures : post.linkInfo?.pictureUrl,
      },
    }
    return [item]
  })
}

export function createJikeHeaders(accessToken: string): Record<string, string> {
  return {
    "accept": "application/json, text/plain, */*",
    "platform": "web",
    "x-jike-access-token": accessToken,
  }
}

export function buildJikeTopicFeedUrl(order: TopicFeedOrder): string {
  const tab = order === "recent" ? "square" : "selected"
  return `${TOPIC_FEED_BASE_URL}/${tab}/feed`
}
