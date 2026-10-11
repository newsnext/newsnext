import type { NewsItemInput } from "@newsnext/source-kit/types"
import { applyFieldTransforms } from "@newsnext/source-kit/core"

export const ZHIHU_ORIGIN = "https://www.zhihu.com"

export interface ZhihuContent {
  type?: string
  id?: string | number
  url?: string
  question?: { id?: string | number, title?: string }
  title?: string
  excerpt_title?: string
  excerpt?: string
  created_time?: number
  created?: number
  author?: { name?: string, avatar_url?: string }
  voteup_count?: number
  like_count?: number
  comment_count?: number
  favorite_count?: number
  favlists_count?: number
  reaction?: {
    statistics?: {
      applaud_count?: number
      comment_count?: number
      favorites?: number
      like_count?: number
    }
  }
  image_url?: string
}

export interface ZhihuFeed {
  type?: string
  target?: ZhihuContent
  list?: ZhihuFeed[]
  created_time?: number
  action_text?: string
}

export interface ZhihuResponse<T> {
  data?: T[]
}

function contentId(value: string | number | undefined): string | undefined {
  // Never construct an identity from an already-rounded API number.
  if (typeof value === "number") return Number.isSafeInteger(value) && value > 0 ? String(value) : undefined
  return typeof value === "string" && /^\d+$/.test(value) ? value : undefined
}

function pageUrl(value: string | undefined): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value, ZHIHU_ORIGIN)
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return undefined
    const isContentPage = url.hostname === "zhuanlan.zhihu.com"
      ? /^\/p\/\d+(?:\/|$)/.test(url.pathname)
      : ["zhihu.com", "www.zhihu.com"].includes(url.hostname)
        && /^\/(?:question|answer|pin|zvideo)\/\d+(?:\/|$)/.test(url.pathname)
    return isContentPage ? url.href : undefined
  } catch {
    return undefined
  }
}

/** Prefer actual content pages; API URLs are resource identifiers, not click targets. */
export function resolveZhihuUrl(content: ZhihuContent): string | undefined {
  const existing = pageUrl(content.url)
  if (existing) return existing
  const id = contentId(content.id)
  if (!id) return undefined
  switch (content.type) {
    case "answer": {
      const questionId = contentId(content.question?.id)
      return questionId ? `${ZHIHU_ORIGIN}/question/${questionId}/answer/${id}` : undefined
    }
    case "article": return `https://zhuanlan.zhihu.com/p/${id}`
    case "pin": return `${ZHIHU_ORIGIN}/pin/${id}`
    case "question": return `${ZHIHU_ORIGIN}/question/${id}`
    case "zvideo": return `${ZHIHU_ORIGIN}/zvideo/${id}`
    default: return undefined
  }
}

function cleanText(value: string | undefined, maxLength?: number): string {
  return String(applyFieldTransforms(value, [
    "strip_html",
    "normalize_whitespace",
    ...(maxLength === undefined ? [] : [{ op: "truncate" as const, length: maxLength, suffix: "…" }]),
  ]) ?? "")
}

function parseZhihuContent(content: ZhihuContent, feed?: ZhihuFeed): NewsItemInput | undefined {
  const rawTitle = content.question?.title || content.title || content.excerpt_title || (feed ? content.excerpt : undefined)
  const title = feed ? cleanText(rawTitle, 160) : rawTitle
  const url = resolveZhihuUrl(content)
  if (!title || !url) return undefined

  const timestamp = applyFieldTransforms(feed ? feed.created_time : content.created_time ?? content.created, "seconds_to_ms")
  const author = content.author
  const statistics = content.reaction?.statistics
  return {
    title,
    url,
    publishedAt: typeof timestamp === "number" ? timestamp : undefined,
    author: author?.name ? { name: author.name } : undefined,
    icon: author?.avatar_url ? { src: author.avatar_url, kind: "author", label: author.name } : undefined,
    stats: feed
      ? {
          score: statistics?.applaud_count ?? content.voteup_count ?? content.like_count,
          comments: statistics?.comment_count ?? content.comment_count,
          stars: statistics?.favorites ?? content.favorite_count ?? content.favlists_count,
          likes: statistics?.like_count,
        }
      : { score: content.voteup_count, comments: content.comment_count },
    attributes: feed?.action_text ? { activity: feed.action_text } : undefined,
    content: {
      text: feed ? cleanText(content.excerpt || content.excerpt_title) : content.excerpt,
      pictures: content.image_url,
    },
  }
}

export function parseZhihuColumn(response: ZhihuResponse<ZhihuContent>): NewsItemInput[] {
  return (response.data ?? []).flatMap((content) => {
    const item = parseZhihuContent(content)
    return item ? [item] : []
  })
}

export function parseZhihuFollowing(response: ZhihuResponse<ZhihuFeed>): NewsItemInput[] {
  const data = response.data ?? []
  // Preserve the existing loader's ordering: ordinary feeds, then grouped feeds.
  const feeds = [
    ...data.filter(feed => feed.type === "feed"),
    ...data.filter(feed => feed.type === "feed_group").flatMap(feed => feed.list ?? []),
  ]
  return feeds.flatMap((feed) => {
    if (!feed.target) return []
    const item = parseZhihuContent(feed.target, feed)
    return item ? [item] : []
  })
}
